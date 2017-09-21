const fs = require('fs');
require('log-timestamp');
const http = require('http');
const socketio = require('socket.io');
const express = require('express');
const os = require("os");
const passport = require('passport');
const flash = require('connect-flash');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const config = require('./config.js');
const session = require('express-session');


var router = express.Router();
var app = express();
var server = http.Server(app);
var io = socketio(server);

app.use(morgan('dev')); // log every request to the console
app.use(cookieParser()); // read cookies (needed for auth)
app.use(bodyParser()); // get information from html forms
app.use(session({ secret: config.sessionSecret })); // session secret
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash()); // use connect-flash for flash messages stored in session
app.set('view engine', 'ejs');


require('./app/passport.js')(passport);

require('./app/routes.js')(app, express, passport);

require('./app/socket.js')(io);


server.listen(config.port, function () {
    console.log('App listening on ' + config.port);
});

