(function ()
{
    /* 
        This class manages clients. Each client in one browser session (one socket connection).
        Every client subscribes for updates for given set of stops.
        This class maintains the list of stops for every client and informs StopManager of new stop.
        When a client is disconnected, it removes the information of the client and also informs StopManager to remove the stops.
        It filters the updates from StopManager, and sends it to the client based on whichever stops the client has subscribed.
    */

    function ClientManager(stopManager)
    {
        // Maintains a map between client(clientId) and list of stops(stopId).
        var _clientIdStopListMap = {};

        // Maintains a map between client(clientId) and socket.
        var _clientIdSocketMap = {};

        // Maintains a map between stops(stopId) and number of connected clients interested in the stopId.
        var _stopIdClientCountMap = {};

        var _stopManager = stopManager;
        _stopManager.getEventEmitter().on('publishUpdates', publishUpdates);

        function addClient(socket)
        {
            // When a client is connected, we store the socket so that messages can be sent to the client when needed.
            var clientId = socket.id;
            _clientIdSocketMap[clientId] = socket;
            _clientIdStopListMap[clientId] = {};
            console.log("ClientManager: Client Id %s added", clientId);
        }

        function removeClient(socket)
        {
            var clientId = socket.id;

            // Delete client from the client-socket map
            delete _clientIdSocketMap[clientId];

            // Delete all stops from the client-stops map
            var stopList = _clientIdStopListMap[clientId];

            // Get the stops in a temporary array before deleting them
            var stopListArray = new Array();
            for (var stopId in stopList)
            {
                stopListArray.push(stopId);
            }

            for (var i = 0 ; i < stopListArray.length; i++)
            {
                removeStop(clientId, stopListArray[i]);
            }

            // After the items in the list are deleted, delete the list
            delete _clientIdStopListMap[clientId];
            console.log("ClientManager: Client Id %s removed", clientId);
        }

        function addStop(socket, stopId)
        {
            // Add stop to the list.
            var clientId = socket.id;
            var stopList = _clientIdStopListMap[clientId];
            stopList[stopId] = true;
            _stopManager.addStop(stopId);

            if (_stopIdClientCountMap[stopId] == null)
            {
                _stopIdClientCountMap[stopId] = 0;
            }

            _stopIdClientCountMap[stopId]++;
            console.log("ClientManager: Stop Id %d added to Client Id %s", stopId, clientId);
        }

        function removeStop(clientId, stopId)
        {
            // Remove stop from the list.
            if (_clientIdStopListMap[clientId] == null)
            {
                return;
            }

            var stopList = _clientIdStopListMap[clientId];
            delete stopList[stopId];

            _stopIdClientCountMap[stopId]--;
            if (_stopIdClientCountMap[stopId] <= 0)
            {
                delete _stopIdClientCountMap[stopId];
                _stopManager.removeStop(stopId);
            }

            console.log("ClientManager: Stop Id %d removed from Client Id %s", stopId, clientId);
        }

        // This is a callback method that is triggered when StopManager fire updates
        function publishUpdates(stopListUpdates)
        {
            // Loops through each client and filters the interested updates for the given client
            for (var clientId in _clientIdStopListMap)
            {
                var stopList = _clientIdStopListMap[clientId];
                var clientStopListUpdates = {};
                var clientStopListUpdatesCount = 0;
                for (var stopId in stopList)
                {
                    if (stopListUpdates[stopId] != null)
                    {
                        clientStopListUpdates[stopId] = stopListUpdates[stopId];
                        clientStopListUpdatesCount++;
                    }
                }

                if (clientStopListUpdatesCount > 0)
                {
                    // If updates found for a given client, push it to the client
                    var clientSocket = _clientIdSocketMap[clientId];
                    clientSocket.emit('updates', clientStopListUpdates);
                }
            }
        }

        return {
            addClient: addClient,
            removeClient: removeClient,
            addStop: addStop,
            removeStop: removeStop
        };
    }

    module.exports = ClientManager;
})();