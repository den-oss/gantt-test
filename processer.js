const jsdom = require("jsdom__no_cors");
const { JSDOM } = jsdom;
const canvas = require('canvas-prebuilt');
const Storage = require('dom-storage')
let request = require('request__no_405');
//request.debug = true;
const fs = require('fs');
require('log-timestamp');
const os = require("os");
const EventEmitter = require('events');
const EmfProcess = require('./EmfProcess');
const assert = require('assert');


class GntProcesser extends EventEmitter {
	constructor(opts, workerId = -1, workerProcess = null) {
		super();

		assert(workerId != -1);
	    assert(workerProcess instanceof EmfProcess);

		let defOpts = {
			filePath: './app/build/production/CGA/index.html',
			cachePath: './out/out.html',
			runAppFromFileProtocol: true,
			appQuery: '?projectId=a4G6A000000L0bs&showHeader=false&sidebar=false&groupingType=ParentStageType%E2%80%8E',
			stalledTimerSesc: 60*5, //5min
		};
		this.opts = Object.assign({}, defOpts, opts);
		this.opts.appUrl = this.opts.baseUrl + '/build/' + this.opts.appQuery;
		this.opts.fileUrl = 'file://' + __dirname + '/app/build/production/CGA/index.html' + this.opts.appQuery;

		this.domInst = null;

	    this.consoleListener = {};
	    for (let type of ['log', 'info', 'error', 'warn', 'dir', 'debug', 'trace']) {
	        this.consoleListener[type] = (...args) => this.onConsole(type, ...args);
	    }
	    this.stalledTimer = null;
	    this.startDate = this.lastActiveDate = this.endDate = null;

	    this.workerId = workerId;
	    this.process = workerProcess;
	    this.process.on('getMemoryUsage', this.mw_getMemoryUsage.bind(this));
	    this.process.on('run', this.mw_run.bind(this));
	    this.process.on('save', this.mw_save.bind(this));
	}

	mw_getMemoryUsage () {
		this.process.emit("answ_getMemoryUsage", {
			mu: process.memoryUsage()
		});
	}

	mw_run () {
		this.run()
		.then(domInst => {
			this.process.emit("answ_run", {
				info: domInst.info,
			});
		})
		.catch(err => {
			this.process.emit("error", err);
		});
	}

	mw_save () {
		this.save()
		.then(domInst => {
			this.process.emit("answ_save", {
				info: domInst.info,
			});
		})
		.catch(err => {
			this.process.emit("error", err);
		});
	}

	onConsole (type, ...args) {
		this.restartStalledTimer();
		this.process.emit('console', {
			type,
			...args
		});
	}

	onStalled () {
		let elapsedTime = (new Date() - this.startDate) / 1000;
		let stalledTime = (new Date() - this.lastActiveDate) / 1000;
		this.emit('stalled', {
			elapsedTime,
			stalledTime
		});
		this.destroy();
	}

	runStalledTimer () {
		this.lastActiveDate = new Date();
		this.stalledTimer = setTimeout(this.onStalled.bind(this), this.opts.stalledTimerSesc);
	}
	stopStalledTimer () {
		this.lastActiveDate = null;
		clearInterval(this.stalledTimer);
		this.stalledTimer = null;
	}
	restartStalledTimer () {
		this.stopStalledTimer();
		this.runStalledTimer();
	}

	save () {
		if (!this.domInst)
			throw new Error("No DOM instance!");
	    return new Promise((resolve, reject) => {
	        //.............. todo
	    });
	}

	destroy () {
		this.domInst = null;
	}

	serializeHtml () {
		if (!this.domInst)
			throw new Error("No DOM instance!");
		let opts = this.opts;
	    return new Promise((resolve, reject) => {
			var html = this.domInst.dom.serialize();
            html += "<hr/>generated in " + elapsedTime + "sec";
			this.domInst.html = html;
            fs.writeFile(opts.cachePath, html, function(err) {
                if (err) {
                    console.error(err);
                    reject(err);
                } else {
                    console.log("out.html saved");
                    this.domInst.cachePath = opts.cachePath;
                    resolve(this.domInst);
                }
            });
	    });
	}

	run () {
		this.destroy();
		let opts = this.opts;
        this.startDate = new Date();

        var info = {};
        var virtualConsole = new jsdom.VirtualConsole();
        //virtualConsole.sendTo(console , {omitJSDOMErrors: false});
        virtualConsole.sendTo(this.consoleListener, {omitJSDOMErrors: false});
        var cookieJar = new jsdom.CookieJar();
        var jsdomOptions = {
            userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36",
            includeNodeLocations: true,
            runScripts: "dangerously",
            resources: "usable",
            virtualConsole: virtualConsole,
            cookieJar: cookieJar,
        };

        let url = opts.runAppFromFileProtocol ? opts.filePath + opts.appQuery : opts.appUrl;
        this.restartStalledTimer();
        let prom = opts.runAppFromFileProtocol ? 
            JSDOM.fromFile(opts.filePath, jsdomOptions) : 
            JSDOM.fromURL(opts.appUrl, jsdomOptions);
        return prom.then(dom => {
        	this.restartStalledTimer();
	    	return new Promise((resolve, reject) => {
	            var window = dom.window;
	            if (opts.runAppFromFileProtocol)
	                window.location.search = opts.appQuery;
	            if (opts.consoleListener)
	                opts.consoleListener.log('url loaded', url);
	            window.localStorage = new Storage(null, { strict: false, ws: '  ' });
	            window.sessionStorage = new Storage(null, { strict: true });
	            window._onInitDataLoad = () => {
	            	this.restartStalledTimer();
	                if (opts.consoleListener)
	                    opts.consoleListener.log('_onInitDataLoad');
	            };
	            window._onAppLoaded = () => {
	            	this.stopStalledTimer(); //finish!
	                if (opts.consoleListener)
	                    opts.consoleListener.log('_onAppLoaded');
	                setTimeout(() => { //wait a bit more for sure..
	                    this.endDate = new Date();
	                    var elapsedTime = (this.endDate - this.startDate) / 1000;
	                    if (opts.consoleListener)
	                        opts.consoleListener.log('app loaded in ' + elapsedTime + ' sec');
	                    info.elapsedTime = elapsedTime;
	                    var domInst = {dom, info};
	                    this.domInst = domInst;
	                    resolve(domInst);
	                }, 1000*5);
	            };
	            this.on('stalled', (info) => {
	            	reject({
	            		message: "Stalled", 
	            		info: info
	            	});
	            });
        	});
        })
        //.then(domInst => this.serializeHtml())
        .catch(err => {
        	this.stopStalledTimer();
        	throw err;
        });
	}
}

module.exports = GntProcesser;
