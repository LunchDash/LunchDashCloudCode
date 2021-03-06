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

//Define functions and job for push notifications.

Parse.Cloud.define("triggerChatPushNotify",function(request,response){
    triggerChatPushNotify(request,response);
});

Parse.Cloud.define("triggerMatchPushNotify", function(request,response){
    triggerMatchPushNotify(request,response);
});

Parse.Cloud.job("pushNotify", function(request,response){
    triggerMatchPushNotify(request,response);
    triggerChatPushNotify(request,response);
});

function triggerMatchPushNotify(request,response){
  var query = new Parse.Query("UserTable");
  query.equalTo('status', "Waiting");
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
                                    console.log('Found match: '+match.get('matchedUsername')+' and '+match.get('reqUserId')); //Log

                                userlist.push(match.get('reqUserId'));
                                userlist.push(match.get('matchedUserID'));

                                sendPushNotificaiton(match.get('reqUserId'), match.id, 1, match.get('matchedUsername'), match.get('restaurantName') );
                                sendPushNotificaiton(match.get('matchedUserID'), match.id, 1, match.get('reqUserName'), match.get('restaurantName') );
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
}

function triggerChatPushNotify(request,response){
 var query = new Parse.Query("UserRestaurantMatchesTable");
 query.equalTo('reqStatus',"accepted");
 query.equalTo('matchedStatus',"accepted");
 query.find({
    success: function(matches){
        if(matches.length > 0) {
            for(var matchKey in matches){
                var match = matches[matchKey];
                    //console.log(match);
                    var reqUserId = match.get('reqUserId');
                    var matchedUserId = match.get('matchedUserID');

                    var query2 = new Parse.Query("UserTable");
                    query2.equalTo('userId', reqUserId);
                    query2.find({
                        success: function(results) {
                            var status = results[0].get("status");
                            if(status != "Matched"){
                                sendPushNotificaiton(reqUserId, match.id, 2, match.get('matchedUsername'), match.get('restaurantName'));
                                sendPushNotificaiton(matchedUserId, match.id, 2, match.get('reqUserName'), match.get('restaurantName'));

                    //Remove both users from the URTable.  This will prevent further matches from being made from them.
                    clearUser(reqUserId);
                    clearUser(matchedUserId);    
                }

            }
        });

                }
            } else {
                response.success("No Chat matches yet");
            }

        },
        error: function(){
            response.error("Chat Push Failed.");
        }
    });
}


function sendPushNotificaiton(userid, matchid, action, matchedUserName, restaurantName){
    var query = new Parse.Query(Parse.Installation);
    query.equalTo('userid', userid);
    if(action == 1){

        var title = "We've found a potential match!";
        var alert = "Have lunch with "+ matchedUserName +" at "+ restaurantName +" ?";
    } else  if(action == 2){
        title = "We've matched you up!";
        alert = "Get in touch with "+ matchedUserName +" and have a great lunch at "+ restaurantName +" !";
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
            if(action == 1){
                setUserToMatching(userid);
            } else if(action == 2){
                setUserToMatched(userid,matchedUserName,matchid);
            }
        },
        error: function(error) {
            console.log("Push error ");
        }
    });
}

function setUserToMatching(userid)
{
    var query = new Parse.Query("UserTable");
    query.equalTo('userId', userid);
    query.first().then(function(user)
    {
        user.set("status", "Matching");
        user.save();
    });
}

function setUserToMatched(userid, match, matchedUserid)
{
    var query = new Parse.Query("UserTable");
    query.equalTo('userId', userid);
    query.first().then(function(user)
    {
        user.set("status", "Matched");
        user.set("matchedId", match);
        user.set("matchedUserId", matchedUserid);
        user.save();
    });
}

function clearUser(userId){ //Call this after ChatPushNotifs have been sent out.

    //Remove all their entries from UserRestaurantsTable
    var query = new Parse.Query("UserRestaurantsTable");
    query.equalTo('userId',userId);    
    query.find({
        success: function(matches){
            Parse.Object.destroyAll(matches);
        },
        error: function(){
            response.error("UserRestaurantsTable Cleanup Failed");
        }
    });
}
