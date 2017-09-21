var LocalStrategy   = require('passport-local').Strategy;
const config = require("../config");
const users = config.users;

// expose this function to our app using module.exports
module.exports = function(passport) {

    //simnple check login-password (false - only by login)
    function getUserByLoginPassword(login, password = false) {
        return new Promise((resolve, reject) => {
            try {
                if (!config.users)
                    throw new Exception("No users in config");
                let user = null;
                if (config.users[login] != undefined) {
                    user = config.users[login];
                    if (password !== false) {
                        //check pass
                        if (user.password != password) {
                            user = null; //incorrect
                        }
                    }
                }
                resolve(user);
            } catch (exc) {
                reject(exc);
            }
        });
    };

    // used to serialize the user for the session
    passport.serializeUser(function(user, done) {
        done(null, user.login);
    });

    // used to deserialize the user
    passport.deserializeUser(function(login, done) {
        getUserByLoginPassword(login, false)
        .then(user => {
            if (user)
                return done(null, user);
            else
                return done("No used found by login = " + login, null);
        })
        .catch(err => {
            return done(err);
        });
    });

    passport.use('local-login', new LocalStrategy({
        usernameField : 'login',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass back the entire request to the callback
    },
    function(req, login, password, done) { //
        getUserByLoginPassword(login, password)
        .then(user => {
            if (user)
                return done(null, user);
            else
                return done(null, false, req.flash('loginMessage', 'Incorrect user/password'));
        })
        .catch(err => {
            return done(err);
        });
    }));

};
