const config = require("../config");
var baseUrlFn = (req) => 'http://' + req.get('host');
const checkAuthMiddleWare = require("../app/checkAuthMiddleWare.js");

module.exports = function(app, express, passport) {

    app.get('/debug', checkAuthMiddleWare, function (req, res) {
        var clientUrl = baseUrlFn(req) + '/client';
        var logsUrl = baseUrlFn(req) + '/logs/';
        var appUrl = baseUrlFn(req) + '/build/' + config.appQuery;

        let out = "";
        out += "<ul>";
        out += "<li><a href='"+appUrl+"'>run in browser</a></li>";
        out += "<li>note: you must run chrome like that: <pre>"+'/opt/google/chrome/chrome --disable-web-security --user-data-dir="/var/tmp/Chrome dev session"'+"</pre></li>";
        out += "<li><a href='"+clientUrl+"'>NEW client</a></li>";
        out += "</ul>";
        res.send(out);
    });

    app.use('/build', checkAuthMiddleWare, express.static('gantt-app/build/production/CGA'));
    app.use('/app', checkAuthMiddleWare, express.static('gantt-app'));
    app.use('/logs', checkAuthMiddleWare, express.static('logs'));
    app.use('/out', checkAuthMiddleWare, express.static('out'));
    app.use('/', express.static('public'));

    app.get('/', function(req, res) {
        if (req.isAuthenticated())
            res.redirect('/login');
        else
            res.redirect('/profile');
    });

    app.get('/client', checkAuthMiddleWare, function(req, res) {
        res.render('client.ejs', {
            ganttSid: config.ganttSid,
            ganttProjId: config.ganttProjId,
        }); 
    });

    app.get('/login', function(req, res) {
        res.render('login.ejs', {
            message: req.flash('loginMessage')
        }); 
    });

    app.get('/profile', checkAuthMiddleWare, function(req, res) {
        res.render('profile.ejs', {
            user : req.user
        });
    });

    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });

    app.post('/login', passport.authenticate('local-login', {
        successRedirect : '/profile', // redirect to the secure profile section
        failureRedirect : '/login', // redirect back to the signup page if there is an error
        failureFlash : true // allow flash messages
    }));

};
