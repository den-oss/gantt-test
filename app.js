const fs = require('fs');
require('log-timestamp');
const http = require('http');
const socketio = require('socket.io');
const express = require('express');
const os = require("os");
const GntManager = require("./manager");

//-------------

var router = express.Router();
var app = express();
var server = http.Server(app);
var io = socketio(server);
var gm = new GntManager();

var port = (process.env.PORT ? process.env.PORT : 3000);
var appQuery = '?projectId=a4G6A000000L0bs&showHeader=false&sidebar=false&groupingType=ParentStageType%E2%80%8E';
var baseUrlFn = (req) => 'http://' + req.get('host');
var baseUrl = null;

//-------------

app.use('/build', express.static('app/build/production/CGA'));
app.use('/app', express.static('app'));
app.use('/logs', express.static('logs'));
app.use('/out', express.static('out'));
app.use('/client', express.static('client'));

app.get('/', function (req, res) {
    baseUrl = baseUrlFn(req);
    var clientUrl = baseUrlFn(req) + '/client';
    var logsUrl = baseUrlFn(req) + '/logs/';
    var appUrl = baseUrlFn(req) + '/build/' + appQuery;

    let out = "";
    out += "<ul>";
    out += "<li><a href='"+appUrl+"'>run in browser</a></li>";
    out += "<li>note: you must run chrome like that: <pre>"+'/opt/google/chrome/chrome --disable-web-security --user-data-dir="/var/tmp/Chrome dev session"'+"</pre></li>";
    out += "<li><a href='"+clientUrl+"'>NEW client</a></li>";
    out += "</ul>";
    res.send(out);
});

server.listen(port, function () {
    console.log('App listening on ' + port);
});

//-------------

io.on('connection', function (socket) {
  console.log('client connected', socket.id);
  
  socket.on('disconnect', function () {
    let w = gm.getWorkerForClient(socket.id);
    if (w)
        gm.killWorker(w);
    console.log('client disconnected', socket.id);
  });

  socket.on('app_run', function (data) {
    console.log('['+socket.id+']', 'app_run', data);
    var keepConnTimer = setInterval(() => {
        socket.emit('app_ping');
    }, 1000*5);
    var onConsole = (type, ...args) => {
        console[type]('['+socket.id+']', ...args);
        socket.emit('app_console', {
            type: type,
            args: args,
        });
    };
    var consoleListener = {};
    for (let type of ['log', 'info', 'error', 'warn', 'dir', 'debug', 'trace']) {
        consoleListener[type] = (...args) => onConsole(type, ...args);
    }
    let createOpts = Object.assign({}, data.opts || {});
    let cmdOpts = {};
    let w = null;
    let wProm = gm.getOrCreateWorkerForClient(socket.id, createOpts, consoleListener)
    wProm
        .then(_w => {
            w = _w;
            return gm.workerCmd(w, 'run', cmdOpts);
        })
        .then(info => {
            clearInterval(keepConnTimer);
            keepConnTimer = null;
            socket.emit('app_run_done', {
                info,
                wid: w.id,
            });

            console.log('['+socket.id+']', '------ run', info);
        })
        .catch(err => {
            clearInterval(keepConnTimer);
            keepConnTimer = null;
            socket.emit('app_error', err);

            console.error('['+socket.id+']', err);
        });
  });

  socket.on('app_save', function (data) {
    console.log('['+socket.id+']', 'app_save', data);
    let wid = data.wid;
    let cmdOpts = Object.assign({}, data.opts || {});
    var keepConnTimer = setInterval(() => {
        socket.emit('app_ping');
    }, 1000*5);
    let w = gm.getWorkerForClient(socket.id);
    gm.workerCmd(w, 'save', cmdOpts)
        .then(info => {
            clearInterval(keepConnTimer);
            keepConnTimer = null;
            socket.emit('app_save_done', {
                info,
            });

            console.log('['+socket.id+']', '------ save', info);
        })
        .catch(err => {
            clearInterval(keepConnTimer);
            keepConnTimer = null;
            socket.emit('app_error', err);

            console.error('['+socket.id+']', err);
        });
  });

});


