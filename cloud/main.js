
// Use Parse.Cloud.define to define as many cloud functions as you want.
// For example:
Parse.Cloud.define("hello", function(request, response) {
  response.success("Hello world!");
});



Parse.Cloud.define("pushNotfication", function(request, response) {

    var query = new Parse.Query(Parse.Installation);
    query.equalTo('userid', request.params.userid);

    Parse.Push.send({
        where: query, // Set our Installation query
        data: {
            title: "Lunch Dash Has a new Match",
            alert: "New resturant Match",
            expiration_interval: 300
        }
    }, {
        success: function() {
            response.success();
        },
        error: function(error) {
            response.error(error);
        }
    });
});

