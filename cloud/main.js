
Parse.Cloud.define("pushNotfication", function(request, response) {
    var userid = request.params.userid;
    sendPushNotificaiton(userid, '');
    response.success();
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



Parse.Cloud.job("triggerMatchPushNotify", function(request, response) {

    var query = new Parse.Query("UserTable");
    query.find({
        success: function(results) {

            var userlist = new Array();

            for (var i = 0; i < results.length; i++) {
                var userid = results[i].get('userId');

                var queryreq = new Parse.Query("UserRestaurantMatchesTable")
                    .equalTo('reqUserId', userid)
                    .equalTo('reqStatus', 'waiting')
                    .equalTo('matchedStatus', 'waiting');
                var querymatch = new Parse.Query("UserRestaurantMatchesTable")
                    .equalTo('matcherUserId', userid)
                    .equalTo('matchedStatus', 'waiting')
                    .equalTo('reqStatus', 'waiting');

                Parse.Query.or(queryreq,querymatch).find({
                    success: function(matches) {
                        if(matches.length > 0){
                            for(var matchKey in matches){
                                var match = matches[matchKey];
                                if((userlist.indexOf(match.get('reqUserId')) == -1)
                                    && (userlist.indexOf(match.get('matchedUserID')) == -1)) {
                                    //console.log(match.get('reqUserId'));
                                    //console.log(match.get('matchedUserID'));
                                    userlist.push(match.get('reqUserId'));
                                    userlist.push(match.get('matchedUserID'));

                                    sendPushNotificaiton(match.get('reqUserId'), match.id, 1);
                                    sendPushNotificaiton(match.get('matchedUserID'), match.id, 1);
                                }
                            }
                        }
                    },
                    error: function() {
                        response.error("Could not find user");
                    }
                });
            }
        },
        error: function() {
            response.error("Match push failed.");
        }
    });
});


function sendPushNotificaiton(userid, matchid, action){
    var query = new Parse.Query(Parse.Installation);
    query.equalTo('userid', userid);
    var title = "New Match";
    var alert = "You have a new Match";
    if(action == 2){
        title = "Lunch fixed";
        alert = "Get in touch with them";
    }


    Parse.Push.send({
        where: query, // Set our Installation query
        data: {
            title: title,
            alert: alert,
            userid:userid,
            matchid:matchid,
            action:action
        }
    }, {
        success: function() {
            //console.log("Push Sent ");
        },
        error: function(error) {
            console.log("Push error ");
        }
    });

}


