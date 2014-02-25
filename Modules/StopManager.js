(function ()
{
    /*
        This class manages list of all stops for which there is atleast one client which has subscribed for updates.
        If there are no client intersted for a stop, that stop is removed.
        For a given set of stops at any given time, it periodically fetches the updates by making bulk call to the nextbus service.
        This class ensures the calls made to the external service (nextbus) is optimized by making sure:-
        1. Doesn't exceed the throttling limits (no limit set presently)
        2. Based on throttling limit and current load, adjusts the polling interval.
        3. Makes bulk batch call to optimize on the throttling limits.

        After every fetch call it publishes updates by firing event publishUpdates. The ClientManager, which binds to this event, 
        filters, organizes and pushes the data for each client.
    */
    function StopManager()
    {
        // List of all stops that are read from stopList.xml.
        var _stopList = null;

        // List of all stopIds which the clients are interested for updates.
        var _stopListInterested = {};

        // List of objects representing stop id and street names.
        var _stopStreetNames = null;

        // Counter for stops
        var _stopCount = 0;

        // Object that emits events
        var EventEmitter = require('events').EventEmitter;
        var _eventEmitter = new EventEmitter();

        function getStops()
        {
            return _stopStreetNames;
        }

        function getEventEmitter()
        {
            return _eventEmitter;
        }

        function addStop(stopId)
        {
            // There is a client interested in updates for this client.
            _stopListInterested[stopId] = true;
            var argument = {};
            argument[stopId] = true;
            fetchPredictions(argument);
            console.log("StopManager: Stop Id %d added", stopId);
        }

        function removeStop(stopId)
        {
            // No client is interested in receiving updates for this stop.
            // Remove the stop from fetching updates. 
            delete _stopListInterested[stopId];
            console.log("StopManager: Stop Id %d removed", stopId);
        }

        function loadStops()
        {
            // This method loads the stop information from an xml file and caches it.
            // This is called during startup.
            var fs = require('fs');
            var xml2js = require('xml2js');
            var parser = new xml2js.Parser();
            console.log("StopManager: Loading Stop List");
            fs.readFile('./Files/stopList.xml', function (err, data)
            {
                if (err)
                {
                    return console.log(err);
                }
                else
                {
                    parser.parseString(data, function (parseErr, parseData)
                    {
                        if (parseErr)
                        {
                            return console.log(parseErr);
                        }
                        else
                        {
                            _stopList = {};
                            _stopStreetNames = new Array();
                            for (var index in parseData.body.stop)
                            {
                                var stopItem = parseData.body.stop[index].$;
                                _stopList[stopItem.tag] = stopItem;
                                _stopCount++;

                                _stopStreetNames.push({ data: stopItem.tag, value: stopItem.title });
                            }

                            console.log("Finished loading of StopList.xml. Number of stops: %d.", _stopCount);
                        }
                    });
                }
            });
        }

        function fetchPredictions(stopIdsToFetch)
        {
            // This method fetches updates for a given set of stops
            // It constructs the URL first based on the stopids interested.
            // On response, it parses the updates using xml parsing.
            console.log('Running Fetch predictions');
            var stopListQueryParam = "";
            if (stopIdsToFetch == null)
            {
                stopIdsToFetch = _stopListInterested;
            }

            for (var stopId in stopIdsToFetch)
            {
                var stopItem = _stopList[stopId];
                if (stopItem != null)
                {
                    var routeLists = stopItem.routes.split(',');
                    for (var item in routeLists)
                    {
                        stopListQueryParam += "&" + "stops=" + encodeURIComponent(routeLists[item]);
                    }
                }
            }

            if (stopListQueryParam != "")
            {
                var http = require('http');
                var xml2js = require('xml2js');
                var parser = new xml2js.Parser();

                var options = {
                    host: 'webservices.nextbus.com',
                    path: '/service/publicXMLFeed?command=predictionsForMultiStops&a=sf-muni' + stopListQueryParam
                };

                console.log('Fetching predictions from Path %s', options.path);
                callback = function (response)
                {
                    var str = '';

                    // Another chunk of data has been recieved, so append it to `str`
                    response.on('data', function (chunk)
                    {
                        str += chunk;
                    });

                    // The whole response has been recieved, so we just print it out here
                    response.on('end', function ()
                    {
                        parser.parseString(str, function (parseErr, parseData)
                        {
                            var stopListUpdates = {};
                            for (var index in parseData.body.predictions)
                            {
                                var item = parseData.body.predictions[index];
                                var stopId = item.$.stopTag;
                                if (stopListUpdates[stopId] == null)
                                {
                                    stopListUpdates[stopId] = {};
                                }

                                var routeList = stopListUpdates[stopId];
                                routeList[item.$.routeTag] = item;
                            }

                            _eventEmitter.emit('publishUpdates', stopListUpdates);
                        });
                    });
                }

                http.request(options, callback).end();

            }
        }

        loadStops();
        setInterval(fetchPredictions, 10000);

        return {
            addStop: addStop,
            removeStop: removeStop,
            getStops: getStops,
            getEventEmitter: getEventEmitter
        };
    }

    module.exports = StopManager;
})();