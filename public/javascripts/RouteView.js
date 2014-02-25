(function ()
{
    // Backbone View for displaying Route information in the search
    window.RouteView = Backbone.View.extend(
        {
            initialize: function ()
            {
                this.template = _.template($('#tpl-route-summary').html());
                this.model.bind("change", this.render, this);
                window.app.routeModelCollectionPinned.bind("pinRemove", this.hidePinLink, this);
                this.detailHidden = true;
            },

            render: function (eventName)
            {
                $(this.el).html(this.template(this.model.toJSON()));

                this.detailElement = $(this.el).find(".routeDetail");
                if (this.detailHidden == true)
                {
                    this.detailElement.hide();
                }
                else
                {
                    this.detailElement.show();
                }

                return this;
            },

            events:
                {
                    "click .routeSummary": "showOrHideDetail",
                    "click .pinBtn": "pinRoute"
                },

            pinRoute: function ()
            {
                // This method is called when user pins a route.
                // It reads the url hash to get list of routes pinned and generate a new hash including this route
                // And then navigate to this hash

                var key = this.model.get('stopId') + ':' + this.model.get('id') + ':' + this.model.get('directionIndex');
                var splits = window.location.hash.split('pin/');
                if (splits.length == 2)
                {
                    if (splits[1].search(key) >= 0)
                    {
                        key = splits[1];
                    }
                    else
                    {
                        key = splits[1] + ',' + key;
                    }
                }

                window.app.navigate('pin/' + key, true);
            },

            showOrHideDetail: function ()
            {
                if (this.detailElement.is(":visible") == false)
                {
                    this.detailElement.show();
                    this.detailHidden = false;
                }
                else
                {
                    this.detailElement.hide();
                    this.detailHidden = true;
                }
            },

            hidePinLink: function (keyRemoved, b, c)
            {
                var key = this.model.get('stopId') + ':' + this.model.get('id') + ':' + this.model.get('directionIndex');
                if (key == keyRemoved)
                {
                    this.render();
                }
            },

            onClose: function ()
            {
                this.model.unbind("change", this.render);
                window.app.routeModelCollectionPinned.unbind("pinRemove");
            }
        });

    // Backbone View container class for all Routes searched at a given stop
    window.RouteListView = Backbone.View.extend(
        {
            initialize: function ()
            {
                this.stopName = "";
                this.template = _.template($('#tpl-route-summary-list').html());
                this.childViews = [];
                this.model.bind("add", this.addChild, this);
                $(this.el).html(this.template(this.model.stopName));
            },

            addChild: function (routeModel)
            {
                var routeView = new RouteView({ model: routeModel });
                this.childViews.push(routeView);
                $(this.el).append(routeView.render().el);
            },

            onClose: function ()
            {
                // On close, unbind all events and dispose all child views
                this.model.unbind("add", this.addChild);
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