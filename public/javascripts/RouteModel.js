(function ()
{
    // Backbone model class for encapsulating route information fora given stop
    window.RouteModel = Backbone.Model.extend(
        {
            defaults:
                {
                    "id": null,
                    "routeTitle": "",
                    "stopId": "",
                    "stopTitle": "",
                    "directionIndex": "",
                    "direction": "",
                    "predictions": [],
                    "messages": []
                }
        });

    // Backbone collection class for RouteModel class
    window.RouteModelCollection = Backbone.Collection.extend(
        {
            model: RouteModel,
            defaults:
                {
                    "stopName": "",
                    "stopId": ""
                }
        });
})();