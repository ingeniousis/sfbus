    /*
        Module dependencies.
    */

var express = require('express');
var routes = require('./routes');
var http = require('http');
var ClientManager = require('./modules/clientmanager');
var StopManager = require('./modules/stopmanager');

    // Start server in express
var app = express();
var server = app.listen(process.env.PORT);

    // Use Socket.io to listen to server
var io = require('socket.io').listen(server);

    // Configure Express settings
app.configure(function ()
{
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.favicon());
    app.use(express.logger('dev'));
    app.use(express.static(__dirname + '/public'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
});

    // Development environment settings
app.configure('development', function ()
{
    app.use(express.errorHandler());
});

    // Set routes.
app.get('/', routes.index);

    // Initialize stopManager, clientManager
var stopManager = StopManager();
var clientManager = ClientManager(stopManager);

io.set('match origin protocol', true);

    // On socket.io connection, setup callback for other events
io.sockets.on('connection',
    function (socket)
    {
        clientManager.addClient(socket);

        socket.on('addStop',
            function (stopid, fn)
            {
                clientManager.addStop(socket, stopid);
                fn(stopid);
            }
        );

        socket.on('disconnect',
            function ()
            {
                clientManager.removeClient(socket);
            }
        );

        socket.emit('stopNames', stopManager.getStops());
    }
);

console.log("Server listening on port %d", process.env.PORT);