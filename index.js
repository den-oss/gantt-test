const jsdom = require("jsdom__no_cors");
const { JSDOM } = jsdom;
const canvas = require('canvas-prebuilt');
const Storage = require('dom-storage')
let request = require('request__no_405');
//request.debug = true;
var fs = require('fs');
require('log-timestamp');

var url = 'http://localhost/plots/build/production/CGA/index.html?projectId=a4G6A000000L0bs&showHeader=false&sidebar=false&groupingType=ParentStageType%E2%80%8E';
var fileUrl = 'file://' + __dirname + '/app/build/production/CGA/index.html?projectId=a4G6A000000L0bs&showHeader=false&sidebar=false&groupingType=ParentStageType%E2%80%8E';
var filePath = './app/build/production/CGA/index.html'; //location.search = '?projectId=a4G6A000000L0bs&showHeader=false&sidebar=false&groupingType=ParentStageType%E2%80%8E';

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

//JSDOM.fromURL(url, options).then(dom => {
JSDOM.fromFile(filePath, options).then(dom => {
	var window = dom.window;
	window.location._search = '?projectId=a4G6A000000L0bs&showHeader=false&sidebar=false&groupingType=ParentStageType%E2%80%8E#en';
	console.log('url loaded', filePath, window.location.search);
	window.localStorage = new Storage(null, { strict: false, ws: '  ' });
    window.sessionStorage = new Storage(null, { strict: true });
	window._onInitDataLoad = () => {
		console.log('_onInitDataLoad()');
	};
	window._onAppLoaded = () => {
		console.log('_onAppLoaded()');
		fs.writeFile("./out/out.html", dom.serialize(), function(err) {
		    if(err) {
		        return console.log(err);
		    }
		    console.log("out.html saved");
		}); 
	};
});


setTimeout(() => {
}, 1000*10);
