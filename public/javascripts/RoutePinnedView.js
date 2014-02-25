(function ()
{
    // Backbone View class for Route pinned
    window.RoutePinnedView = Backbone.View.extend(
        {
            initialize: function ()
            {
                this.template = _.template($('#tpl-route-pinned').html());
                this.model.bind("change", this.render, this);
            },

            render: function (eventName)
            {
                $(this.el).html(this.template(this.model.toJSON()));
                return this;
            },

            events:
                {
                    "click .close": "remove"
                },

            remove: function ()
            {
                // This method is called when a route is unpinned from the dashboard.
                // It reads the url hash to get list of routes pinned and generate a new hash without this route
                // And then navigate to this hash
                var id = this.model.get('stopId') + ':' + this.model.get('id') + ':' + this.model.get('directionIndex');
                var key = '';
                var splits = window.location.hash.split('pin/');
                if (splits.length == 2)
                {
                    var moreSplits = splits[1].split(',');
                    for (var index in moreSplits)
                    {
                        var item = moreSplits[index];
                        if (item != id)
                        {
                            if (key != "")
                            {
                                key += ','
                            }

                            key += item;
                        }
                    }
                }

                if (key == '')
                {
                    window.app.navigate('', true);
                }
                else
                {
                    window.app.navigate('pin/' + key, true);
                }

                // Trigger the unpin event
                window.app.routeModelCollectionPinned.trigger("pinRemove", [id]);
            },

            onClose: function ()
            {
                // unbind events on close
                this.model.unbind("change", this.render);
            }
        });

    // Backbone View container class for all Routes pinned
    window.RoutePinnedListView = Backbone.View.extend(
    {
        initialize: function ()
        {
            this.childViews = [];
            this.noPinTemplate = _.template($('#tpl-route-nopin').html());
            this.model.bind("reset", this.render, this);
            $(this.el).html(this.noPinTemplate());
        },

        render: function ()
        {
            var _this = this;
            $(_this.el).empty();

            if (_this.model.models.length == 0)
            {
                $(_this.el).html(_this.noPinTemplate());
            }
            else
            {
                _.each(_this.model.models, function (routeModel)
                {
                    var routeView = new RoutePinnedView({ model: routeModel });
                    _this.childViews.push(routeView);
                    $(_this.el).append(routeView.render().el);
                });
            }
        },

        onClose: function ()
        {
            this.model.unbind("reset", this.render);
            
            // Disposing all child views
            _.each(this.childViews, function (childView)
            {
                if (childView.close)
                {
                    childView.close();
                }
            });
        }
    });
})();