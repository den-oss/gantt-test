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

var sid = '00D6A0000002RdY!AR4AQFxC.CnJa7uIHDlExZNDMo_zA2tXOvEWM2Q1H.4XnUi2QJxb08KRk2C.F0XoUDf_36WEZV6zFjeZNsHHFUkVCNIbZr.6';
var port = (process.env.PORT ? process.env.PORT : 3000);
var appQuery = '?projectId=a4G6A000000L4QFUA0&showHeader=false&sidebar=false&groupingType=ParentStageType%E2%80%8E'
 //+ "&sid=" + sid
;
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
  
  var keepConnTimer = setInterval(() => {
    socket.emit('app_ping');
  }, 1000*5);

  socket.on('disconnect', function () {
    clearInterval(keepConnTimer);
    keepConnTimer = null;

    let w = gm.getWorkerForClient(socket.id);
    if (w)
        gm.killWorker(w);
    console.log('client disconnected', socket.id);
  });

  socket.on('app_run', function (data) {
    console.log('['+socket.id+']', 'app_run', data);
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
    let cmdOpts = {sid: data.sid, pid: data.pid};
    let w = null;
    let wProm = gm.getOrCreateWorkerForClient(socket.id, createOpts, consoleListener)
    wProm
        .then(_w => {
            w = _w;
            return gm.workerCmd(w, 'run', cmdOpts);
        })
        .then(info => {
            socket.emit('app_run_done', {
                info,
                wid: w.id,
            });

            console.log('['+socket.id+']', 'workerCmd run result', info);
        })
        .catch(err => {
            socket.emit('app_error', err);
            console.error('['+socket.id+']', 'workerCmd error', err);
        });
  });

  socket.on('app_save', function (data) {
    console.log('['+socket.id+']', 'app_save', data);
    let wid = data.wid;
    let cmdOpts = Object.assign({}, data.opts || {});
    //cmdOpts.killOnError = true
    Promise.resolve(gm.getWorkerForClient(socket.id))
    .then(w => {
        if (!w)
            throw new Error("Can't get worker for client id = " + socket.id);
        return gm.workerCmd(w, 'save', cmdOpts);
    })
    .then(info => {
        socket.emit('app_save_done', {
            info,
        });
        console.log('['+socket.id+']', 'workerCmd save result', info);
    })
    .catch(err => {
        socket.emit('app_error', err);
        console.error('['+socket.id+']', 'workerCmd error', err);
    });
  });

});


