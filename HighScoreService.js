
; (function (window) {
    'use strict';
    /**
     * The HighScoreService implements a cloud based leaderboard 
     * system to track your gamers high scores and achivements.
     * The implementation is based on parse.com, so you will have to create a free account at https://parse.com/ to use this class.
     * The parse.com js api must be avaulable at runtime:
     * <script src="//www.parsecdn.com/js/parse-1.6.7.min.js"></script>	
     * 
     * Create an instance of HighScoreService:
     * 
     * var highScoreService = new HighScoreService({
     *      appId: "PARSE_APP_ID", 
     *      key: "PARSE_JS_KEY",
     *      debug:true,
     *      updateUserDetails:function(details, user){
     *          highScoreService.logDebug("updateUserDetails called width", details, user);
     *      },
     *      updateScoreDetails:function(details, highScore){
     *          highScoreService.logDebug("updateScoreDetails called width", details, highScore);
     *      }
     * });
     * 
     * @param {object} config
     * @returns {HighScoreService}
     */
    function HighScoreService(config) {
        this.assertRequired(config, "config");
        this.assertRequired(config.appId, "config.appId");
        this.assertRequired(config.key, "config.key");

        this.config = config;

        this.resetPlayTime();
        
        // Authenticate to parse platform
        Parse.initialize(this.config.appId, this.config.key);
    }
    
    HighScoreService.prototype.resetPlayTime = function () {
        this.playTimeReference = new Date().getTime();
    };
    
    HighScoreService.prototype.getPlayTime = function () {
        return new Date().getTime() - this.playTimeReference;
    };

    HighScoreService.prototype.assertRequired = function (condition, name) {
        if (!condition) {
            throw new Error(name + " parameter is required");
        }
    };

    HighScoreService.prototype.errorHandler = function (object, error) {
        console.log("Parse Operation failed", object, error);
    };

    HighScoreService.prototype.logDebug = function () {
        if (console && this.config.debug) {
            console.log.apply(console, arguments);
        }
    };

    HighScoreService.prototype.logError = function () {
        if (console) {
            console.error.apply(console, arguments);
        }
    };

    HighScoreService.prototype.login = function (credentials, loginSuccess, loginError) {
        this.assertRequired(loginSuccess, "loginSuccess");
        this.assertRequired(credentials.username, "credentials.username");

        if (!loginError) {
            loginError = this.errorHandler;
        }

        this.loginSuccess = loginSuccess;
        this.loginError = loginError;
        var self = this;
        this.userExists(credentials.username, function (exists) {
            if (exists) {
                self.loginUser(credentials);
            } else {
                self.createUser(credentials);
            }
        });
    };

    HighScoreService.prototype.userExists = function (username, callback) {
        var self = this;
        var query = new Parse.Query(Parse.User);
        query.equalTo("username", username);
        query.find({
            success: function (user) {
                if (user && user.length > 0) {
                    self.logDebug("User exists", username);
                    callback(true);
                } else {
                    self.logDebug("User does not exist", username);
                    callback(false);
                }
            },
            error: function (user, error) {
                self.logError("User does not exist", username);
                callback(false);
            }
        });
    };

    HighScoreService.prototype.loginUser = function (credentials) {
        var self = this;
        this.processCredentials(credentials);
        Parse.User.logIn(credentials.username, credentials.password, {
            success: function (user) {
                self.logDebug("Sucessfully logged in user", user);
                self.loginSuccess(user)
            },
            error: this.loginError
        });
    };
    
    HighScoreService.prototype.logoutUser = function () {        
        Parse.User.logOut();
    };
    
    HighScoreService.prototype.processCredentials = function (credentials) {
        if (!credentials.password || credentials.password==="") {
            credentials.password = credentials.username;
        }
        if (!credentials.email || credentials.email==="") {
            credentials.email = credentials.username + "@" + credentials.username + ".com";
        }
    };    

    HighScoreService.prototype.createUser = function (credentials) {
        var self = this;
        var user = new Parse.User();
        this.processCredentials(credentials);
        user.set("username", credentials.username);
        user.set("password", credentials.password);
        user.set("email", credentials.email);
        user.set("timePlayed", 0);
        user.set("userDetails", {});
        if (this.config.updateUserDetails){
            this.config.updateUserDetails(user.get("userDetails"), user);
        }
        user.set("rank", 0);
        
        user.signUp(null, {
            success: function (user) {
                self.logDebug("Created user", user);
                self.createHighScore(function (highScore) {
                    self.loginUser(credentials);
                });
            },
            error: this.errorHandler
        });
    };
    
    HighScoreService.prototype.getUser = function () {
        return Parse.User.current();
    };
    
    HighScoreService.prototype.updateUser = function () {
        var self = this;
        var user = Parse.User.current();         
        user.set("timePlayed",  user.get("timePlayed")+this.getPlayTime());
        if (this.config.updateUserDetails){
            this.config.updateUserDetails(user.get("userDetails"), user);
        }
        user.save(null, {
            success: function(user) {
                self.logDebug("Play time set to", user.get("timePlayed"));
                self.resetPlayTime();
            },
            error: this.errorHandler
        });
    };

    HighScoreService.prototype.getAchievements = function (successCallback) {
        this.assertRequired(successCallback, "successCallback");
        var self = this;    
        var query = new Parse.Query("Achievement");
        query.equalTo("user", Parse.User.current());
        query.find({
            success: function (achievements) {
                self.logDebug("Loaded achievements", achievements);
                successCallback(achievements);
            },
            error: this.errorHandler
        });
    };
    
    HighScoreService.prototype.addAchievement = function (name, description, score, details, callback) {
        var self = this;

        var Achievement = Parse.Object.extend("Achievement");
        var achievement = new Achievement();
        achievement.set("name", name);
        achievement.set("description", description);
        achievement.set("score", score);
        achievement.set("user", Parse.User.current());
        achievement.set("details", details);
        
        var acl = new Parse.ACL(Parse.User.current());
        acl.setPublicReadAccess(false);
        achievement.setACL(acl);
        
        achievement.save(null, {
            success: function (achievement) {
                self.logDebug("Saved achievement with id", achievement);
                self.setScore(score, true, function(highScore){
                    if (callback) {
                        callback(achievement);
                    }
                });                
            },
            error: this.errorHandler
        });
    };

    HighScoreService.prototype.getHighScore = function (successCallback) {
        this.assertRequired(successCallback, "successCallback");
        var self = this;    
        // Create a query object
        var query = new Parse.Query("HighScore");
        query.equalTo("user", Parse.User.current());
        query.find({
            success: function (highScore) {
                self.logDebug("Loaded high score", highScore);
                successCallback(highScore[0]);
            },
            error: this.errorHandler
        });
    };
    
    HighScoreService.prototype.createHighScore = function (callback) {
        var HighScore = Parse.Object.extend("HighScore");
        var highScore = new HighScore();
        highScore.set("score", 0);
        highScore.set("lastScore", 0);
        highScore.set("scoreDetails", {});
        highScore.set("username", Parse.User.current().get("username"));
        highScore.set("user", Parse.User.current());
        this.saveHighScore(highScore, callback);
    };

    HighScoreService.prototype.saveHighScore = function (highScore, callback) {
        var self = this;
        var acl = new Parse.ACL(Parse.User.current());
        acl.setPublicReadAccess(true);
        highScore.setACL(acl);
        highScore.save(null, {
            success: function (highScore) {       
                self.updateUser();
                self.logDebug("Saved highscore with id", highScore);
                if (callback) {
                    callback(highScore);
                }
            },
            error: this.errorHandler
        });
    };

    HighScoreService.prototype.getLeaderBoard = function (limit, centerPlayer, successCallback) {
        var self = this;
        var query = new Parse.Query("HighScore");
        query.ascending("rank");
        query.limit(limit);
        
        if (centerPlayer === null || centerPlayer === undefined){
            centerPlayer = false;
        }
        
        if (centerPlayer){
            this.getHighScore(function(highScore){
                var start = highScore.get("rank")-(Math.floor(limit/2));
                if (start > 1){
                    query.greaterThanOrEqualTo("rank", start);
                }
                query.find({
                    success: function (leaderBoard) {
                        self.logDebug("Loaded centered leaderboard", leaderBoard);
                        successCallback(leaderBoard);
                    },
                    error: self.errorHandler
                });
            });           
        } else {
            query.find({
                success: function (leaderBoard) {
                    self.logDebug("Loaded leaderboard", leaderBoard);
                    successCallback(leaderBoard);
                },
                error: this.errorHandler
            });
        }
        
    };

    HighScoreService.prototype.setScore = function (score, add, callback) {
        var self = this;
        this.getHighScore(function (highScore) {
            if (add) {
                score = score + highScore.get("score");
            }
            highScore.set("lastScore", highScore.get("score"));            
            highScore.set("score", score);
            if (self.config.updateScoreDetails){
                self.config.updateScoreDetails(highScore.get("scoreDetails"), highScore);
            }
            self.saveHighScore(highScore, callback);
        });
    };

   /**
   * Add HighScoreService to global namespace
   */
    window.HighScoreService = HighScoreService;

})(window);