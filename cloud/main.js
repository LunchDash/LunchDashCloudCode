
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
            expiration_interval: 300,
            userid:request.params.userid,

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

Parse.Cloud.define("userGetInfo", function(request, response) {
    var userId = request.params.userid;
    if( userId ){
        var query = new Parse.Query("UserTable");
        query.equalTo('userId', userId);
        query.limit(1);
        query.find({
            success: function(results) {
                response.success(results[0]);
            },
            error: function() {
                response.error("Could not find user");
            }
        });
    } else {
        response.error("Could not find user");
    }
});


Parse.Cloud.define("triggerMatchPushNotify", function(request, response) {
    var query = new Parse.Query("UserTable");
    query.find({
        success: function(results) {
            for (var i = 0; i < results.length; i++) {
                var user = results[i];
                var userid = user.get('userId');
                //console.log(userid);
                var queryMatchreq = new Parse.Query("UserRestaurantMatchesTable");
                queryMatchreq.equalTo('reqUserId', userid);
                queryMatchreq.equalTo('reqStatus', 'waiting');

                var queryMatchmatch = new Parse.Query("UserRestaurantMatchesTable");
                queryMatchmatch.equalTo('matchedUserID', userid);
                queryMatchmatch.equalTo('matchedStatus', 'waiting');
                var mainQuery = Parse.Query.or(queryMatchreq, queryMatchmatch);
                mainQuery.find({
                    success: function(results2) {
                        console.log("got a result");

                        //response.success(results2);
                        return;
                    },
                    error: function(error) {
                        response.error(error);
                        return;
                    }
                });

            }
            response.success();
        },
        error: function() {
            response.error("Match push failed.");
        }
    });


});

