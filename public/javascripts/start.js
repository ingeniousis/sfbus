
(function ()
{
    // Assigning a variable to access template variables
    _.templateSettings.variable = "tv";

    // Extending the Backbone View with a close method to take care of clearing the DOM and unbind events.
    Backbone.View.prototype.close = function ()
    {
        this.remove();
        this.unbind();
        if (this.onClose)
        {
            // If onClose defined, call it.
            this.onClose();
        }
    }

    // Log tracing in the console.
    function reportEvent(log)
    {
        var trace = new Date().toGMTString() + ": " + log;
        console.log(trace);
    }

    // The Backbone Router Class that routes and manages History 
    var AppRouter = Backbone.Router.extend(
        {
            routes:
                {
                    "pin/:query": "pinStops",
                    "": "start"
                },

            initialize: function ()
            {
                var _this = this;
                
                // Create socket.io connection 
                _this.socket = io.connect();

                // Initialization
                _this.stopSearched = null;
                _this.routeModelCollectionSearched = new RouteModelCollection();
                _this.routeListView = null;

                _this.routesPinned = [];
                _this.routeModelCollectionPinned = new RouteModelCollection();
                _this.routeListPinnedView = null;

                _this.socket.on('connect',
                    function ()
                    {
                        reportEvent('Connected');
                    });

                // On receiving stop names from the server
                _this.socket.on('stopNames',
                    function (stopNamesList)
                    {
                        reportEvent('Stop Names Retrieved: ' + stopNamesList.length);
                        $('#autocomplete').val('');

                        // Setup autocomplete function pulling from stopNamesList[] array
                        $('#autocomplete').autocomplete({
                            lookup: stopNamesList,
                            onSelect: function (suggestion)
                            {
                                $('#autocomplete').val('');

                                // On stop selected by the user, call addStop to subscribe for updates for this stop
                                _this.socket.emit('addStop', suggestion.data, function (stopid)
                                {
                                    reportEvent('Stop Id: ' + stopid + ' selected.');
                                    _this.stopSearched = stopid;
                                    _this.routeModelCollectionSearched.reset();
                                    _this.routeModelCollectionSearched.stopName = suggestion.value;
                                    _this.routeModelCollectionSearched.stopId = stopid;
                                    if (_this.routeListView)
                                        _this.routeListView.close();
                                    _this.routeListView = new RouteListView({ model: _this.routeModelCollectionSearched });
                                    $('#stopSearchResult').html(_this.routeListView.el);
                                });
                            }
                        });
                    });
                
                // On receiving updates 
                _this.socket.on('updates',
                    function (stopListUpdates)
                    {
                        var stopIdString = '';
                        for (var stopId in stopListUpdates)
                        {
                            var routeList = stopListUpdates[stopId];
                            for (var routeId in routeList)
                            {
                                var route = routeList[routeId];
                                for (var index in route.direction)
                                {
                                    if (stopId == _this.stopSearched)
                                    {
                                        var routeModel = new RouteModel(
                                        {
                                            id: route.$.routeTag,
                                            routeTitle: route.$.routeTitle,
                                            stopId: route.$.stopTag,
                                            stopTitle: route.$.stopTitle,
                                            directionIndex: index,
                                            direction: route.direction[index].$.title,
                                            predictions: route.direction[index].prediction,
                                            message: route.message
                                        });

                                        _this.routeModelCollectionSearched.add(routeModel, { merge: true });
                                    }

                                    var key = stopId + ':' + routeId + ':' + index;
                                    if (_this.routesPinned[key])
                                    {
                                        var routeModel = _this.routesPinned[key];
                                        routeModel.set(
                                            {
                                                routeTitle: route.$.routeTitle,
                                                stopTitle: route.$.stopTitle,
                                                direction: route.direction[index].$.title,
                                                predictions: route.direction[index].prediction,
                                                message: route.message
                                            });
                                    }
                                }
                            }

                            stopIdString += ' ' + stopId;
                        }

                        reportEvent('Stop Names Updates Received for stops' + stopIdString);
                    });
            },

            start: function ()
            {
                this.routesPinned = [];
                this.routeModelCollectionPinned.reset();
            },
            
            pinStops: function (query)
            {
                if (query)
                {
                    var splitItems = query.split(',');
                    var newRoutesPinned = {};
                    for (var index in splitItems)
                    {
                        var splitItem = splitItems[index];
                        if (this.routesPinned[splitItem])
                        {
                            newRoutesPinned[splitItem] = this.routesPinned[splitItem];
                            continue;
                        }

                        var stopSplits = splitItem.split(':');
                        var stopId = stopSplits[0];
                        var routeId = stopSplits[1];
                        var directionIndex = stopSplits[2]

                        if (routeId && stopId)
                        {
                            var routeModel = new RouteModel(
                                            {
                                                id: routeId,
                                                stopId: stopId,
                                                directionIndex: directionIndex
                                            });

                            newRoutesPinned[splitItem] = routeModel;
                            this.socket.emit('addStop', stopId, function (stopid)
                            {
                                reportEvent('Stop Id: ' + stopid + ' pinned');
                            });
                        }
                    }

                    delete this.routesPinned;
                    this.routesPinned = newRoutesPinned;

                    var routeModelArray = [];
                    for (var key in this.routesPinned)
                    {
                        routeModelArray.push(this.routesPinned[key]);
                    }

                    if (routeModelArray.length > 0 && this.routeListPinnedView == null)
                    {
                        this.routeListPinnedView = new RoutePinnedListView({ model: this.routeModelCollectionPinned });
                        $('#pinnedRoutes').html(this.routeListPinnedView.el);
                    }

                    this.routeModelCollectionPinned.reset(routeModelArray);
                }
            }
        });

    var app = new AppRouter();
    Backbone.history.start();
    window.app = app;

})();