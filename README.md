# parse-highscore-service
JS implementation of a highscore and leaderboard service based on [parse.com](parse.com)


## Objective
The HighScoreService Class can be used for HTML5 games, where a simple cloud based highscore and leaderboard system is needed. For smaller games it may not be an option to depend on Google's or Apple's game services. 
The implementation has no other dependencies than the parse.com api client.


## Description
The functionality for the highsore service divides in two parts. The first one is the cloud code (```main.js```) which runs as a parse.com application.  
The second one is the HighScoreService class (```HighScoreService.js```) as a client. It connects to the parse backend and handles data via Parse JavaScript SDK.  
The [parse backend](https://dashboard.parse.com/apps/) gives you some very nice functionality. Just take a look to the analytics section of your app to have an idea about the usage of your game or browse the complete data via core section.


## Features
* Manage players (Users)
* Player specific highscores
* Track players game time
* Manage achievements for players
* Leaderboard
* Store game specific values to the detail objects of user and highscore entities


## Getting startet

### 1. Create a free account at parse.com
Go to parse.com [signup page](https://www.parse.com/signup) to create a free account and choose an app name for your games highscore backend.

### 2. Install parse.com command line tool
Because we need some Server Code that does our ranking, we have to deploy the cloud application part of the highscore service via parse.com cloud code option.
Therefore we need to install the parse.com command line tool as described [here](https://parse.com/docs/cloudcode/guide#command-line-installation).

### 3. Create your parse app
Go to your terminal and type `parse new`. Choose the existing app from step 1 and follow the instructions on the screen.
After that you will have a parse.com project on your workstation that makes it easy to modify and deploy the cloud code.  
Now copy the main.js file from form the cloud folder of this repository to the ```cloud``` folder of the created parse application. It contains the code to 
Then you can deploy the cloud code via `parse deploy` command.

### 4. Test your backend
The git repository contains a `test.html` that you can use to test your highscore backend.  
Your Application ID (`PARSE_APP_ID`) and the JavaScript key (`PARSE_APP_ID`) have to be configured in the application panel so that the test app can connect to your backend.  
You can get the two keys from `parse.com > Applications > Your App > App Settings > Security & Keys`.

After that you can choose a user/player name and optionally a password and an email address and hit _Create or Login_.  
If the user does not exist a new user is created, otherwise the existing user is logged in. If you did not specify a password the username is taken as password, which is easy, but less secure.  
After you logged in a player, a panel with game actions comes up. You can add score and achievments from there. The leaderboard data is refreshed on every action and you can see the most important properties of the player in the player stats panel. If you can add scores and you see the leaderboard your Backend should be ready to go, now let's focus on your game.

[Go to Test App](test.html)

### 5. Integrate highscore service in your game

#### 5.1 Install using Bower
You can install highscore service via bower. 

`bower install parse-highscore-service`

#### 5.2 Load dependencies

```
 <script src="//www.parsecdn.com/js/parse-1.6.7.min.js"></script>
 <script src="HighScoreService.js"></script>	
```

#### 5.3 Create an instance of highscore service for use in your game
Define the highscore service instance at your games bootstrap.

```
var highScoreService = new HighScoreService({
      appId: "PARSE_APP_ID", 
      key: "PARSE_JS_KEY",
      debug:true,
      updateUserDetails:function(details, user){
          highScoreService.logDebug("updateUserDetails called width", details, user);
      },
      updateScoreDetails:function(details, highScore){
          highScoreService.logDebug("updateScoreDetails called width", details, highScore);
      }
 });
```

You have to configure the Application ID (`PARSE_APP_ID`) and the JavaScript key (`PARSE_APP_ID`) so that the your client side game can connect to your backend.  
You can get the two keys fom `parse.com > Applications > Your App > App Settings > Security & Keys`.  
If you set the debug property to `true` the servcice will log it's actions to the console.  
You can optionally configure callbacks to do your stuff when user is persisted (`updateUserDetails`) or when a highScore object is persisted (`updateScoreDetails`).


### 6. Use highscore service in your game

#### 6.1 Login or create user
The first call you have to do is the login call, beause everything works on data of the user.

```
highScoreService.login({username: 'username', password: 'password', email: 'test@test.com'}, function(user){
	console.log("Got login callback for", user);
});	
```

#### 6.2 Modifying players score

```
highScoreService.setScore(500, true, function(highScore){
	console.log("Score set to", highScore.get("score"));
});	
```

#### 6.3 Adding an achievement

```
highScoreService.addAchievement('name', 'description', 200, {myDetailProperty:'...'}), function(achievement){
	...
});	
```

#### 6.4 Get the current highscore

```
highScoreService.getHighScore(function(highScore){
	...
});			
```

#### 6.5 Get leaderboard
##### 6.5.1 Top 10 Example
Returns the top 10 ranks regardless of the current players rank.

```
highScoreService.getLeaderBoard(10, false, function(leaderBoard){
	for (var i = 0;i < leaderBoard.length; i++){
		// leaderBoard[i].get("rank") leaderBoard[i].get("username") leaderBoard[i].get("score") ...
	}			
});			
```

##### 6.5.2 Centered to player
Returns 5 ranks centered around the current players rank.

```
highScoreService.getLeaderBoard(5, true, function(leaderBoard){
	for (var i = 0;i < leaderBoard.length; i++){
		...
	}			
});			
```
#### 6.6 Get the current players achievements

```
highScoreService.getAchievements(function(achievements){
	for (var i = 0;i < achievements.length; i++){
		//achievements[i].get("name") achievements[i].get("description") achievements[i].get("score") ...
	}
});				
```

### 7. Security
The parse api helps to secure user data and provides ACL mechanisms for every entity.  
But since highscore service is a client side application, some more advanced users could try to cheat and submit hacked scores by using the JS methods. The only way to work against that is to validate the highscore submissions by using cloud code.  

You can place a second event listener in your `main.js` file:

```
/**
 * Validate submitted scores 
 */
Parse.Cloud.beforeSave("HighScore", function(request, response) {
  	  Parse.Cloud.useMasterKey();
      var highScore = request.object;
      var user = request.user;
      var valid = ...; //implement your validation logic here
      if (!valid) {
          response.error("Can not validate submtted score!");
      }
});
```

Your validation options could be to investigate the details object (`highScore.get("scoreDetails")`) and enforce a correlation between values of the details object and the submitted score value. Details can be passed in from the client using the `updateScoreDetails` callback.

Another option is to look for the former score state `highScore.get("lastScore")` subject to the current score `highScore.get("score")`.

A third option could be to correlate the submitted score `highScore.get("score")-highScore.get("lastScore")` to the users time played `user.get("timePlayed")`.

After modifications of the `main.js` file you have to upload it to the cloud using `parse deploy` command.


