const jsdom = require("jsdom__no_cors");
const { JSDOM } = jsdom;
const canvas = require('canvas-prebuilt');
const Storage = require('dom-storage')
let request = require('request__no_405');
//request.debug = true;
const fs = require('fs');
require('log-timestamp');
const express = require('express');
const os = require("os");

//-------------

var router = express.Router();
var app = express();

var port = (process.env.PORT ? process.env.PORT : 3000);
var baseUrl = (req) => 'http://' + req.get('host');
var appQuery = '?projectId=a4G6A000000L0bs&showHeader=false&sidebar=false&groupingType=ParentStageType%E2%80%8E';
var appUrl = (req) => baseUrl(req) + '/build/' + appQuery;
var fileUrl = 'file://' + __dirname + '/app/build/production/CGA/index.html' + appQuery;
var filePath = './app/build/production/CGA/index.html';
var cachePath = './out/out.html';
var runUrl = (req) => baseUrl(req) + '/run';
var runCachedUrl = (req) => baseUrl(req) + '/out/out.html';
var runAppFromFileProtocol = true;
var logsUrl = (req) => baseUrl(req) + '/logs/';

//-------------

app.use('/build', express.static('app/build/production/CGA'));

app.use('/app', express.static('app'));
app.use('/logs', express.static('logs'));
app.use('/out', express.static('out'));

app.get('/', function (req, res) {
    let out = "";
    out += "<ul>";
    out += "<li><a href='"+appUrl(req)+"'>run in browser</a></li>";
    out += "<li>note: you must run chrome like that: <pre>"+'/opt/google/chrome/chrome --disable-web-security --user-data-dir="/var/tmp/Chrome dev session"'+"</pre></li>";
    out += "<li><a href='"+runUrl(req)+"'>run on server (live)</a></li>";
    out += "<li><a href='"+runCachedUrl(req)+"'>run on server (cached)</a></li>";
    out += "<li><a href='"+logsUrl(req)+"/out2.log"+"'>logs</a></li>";
    out += "</ul>";
    res.send(out);
});

app.get('/run', function (req, res) {
    console.log('-----run');
    res.set('Content-Type', 'text/html');
    runAppOnServer(res).then(({dom, html}) => {
        //res.write(html);
        res.redirect('/out/out.html');
        res.end()
    }).catch(err => {
        res.write('error');
        res.end()
    });
});

app.listen(port, function () {
    console.log('App listening on ' + port);
});

//-------------

function runAppOnServer(res) {
    return new Promise((resolve, reject) => {
        var t1 = new Date();

        var virtualConsole = new jsdom.VirtualConsole();
        virtualConsole.sendTo(console , {omitJSDOMErrors: false});
        var cookieJar = new jsdom.CookieJar();
        var options = {
            userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36",
            includeNodeLocations: true,
            runScripts: "dangerously",
            resources: "usable",
            virtualConsole: virtualConsole,
            cookieJar: cookieJar,
        };

        let url = runAppFromFileProtocol ? filePath + appQuery : appUrl(req);
        let prom = runAppFromFileProtocol ? JSDOM.fromFile(filePath, options) : JSDOM.fromURL(appUrl(req), options);
        prom.then(dom => {
            var window = dom.window;
            if (runAppFromFileProtocol)
                window.location.search = appQuery;
            console.log('url loaded', url);
            window.localStorage = new Storage(null, { strict: false, ws: '  ' });
            window.sessionStorage = new Storage(null, { strict: true });
            var keepConnTimer = setInterval(() => {
                res.write(" ");
            }, 1000*1);
            window._onInitDataLoad = () => {
                console.log('_onInitDataLoad()');
            };
            window._onAppLoaded = () => {
                console.log('_onAppLoaded()');
                clearInterval(keepConnTimer);
                keepConnTimer = null;
                setTimeout(() => {
                    var html = dom.serialize();
                    var t2 = new Date();
                    html += "<hr/>generated in " + (t2-t1)/1000 + "sec";
                    fs.writeFile(cachePath, html, function(err) {
                        if (err) {
                            console.error(err);
                            reject(err);
                        } else {
                            console.log("out.html saved");
                            resolve({dom, html});
                        }
                    });
                }, 1000*5);
            };
        });
    });
}
