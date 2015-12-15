/**
 * Create the ranking for high scores after some score has been saved
 */
Parse.Cloud.afterSave("HighScore", function(request) {
  Parse.Cloud.useMasterKey();
  var query = new Parse.Query("HighScore");
  query.descending("score");
  query.find({useMasterKey : true}).then(function(results) {  		
      	for (var i = 0; i < results.length; ++i) {
       	 	if (results[i].get("rank") != (i+1)){
            	results[i].set("rank", i+1);
            	results[i].save();  
        	}        
      	}
      	console.log("high score ranking successfully created from "+results.length+" highscores");
  });  
});