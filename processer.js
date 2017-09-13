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
const { Script } = require("vm");


class GntProcesser extends EventEmitter {
	constructor(opts, workerId = -1, workerProcess = null) {
		super();

		assert(workerId != -1);
	    assert(workerProcess instanceof EmfProcess);

		let defOpts = {
			filePath: './app/build/production/CGA/index.html',
			cachePath: './out/out.html',
			runAppFromFileProtocol: true,
			appQuery: '?showHeader=false&sidebar=false&groupingType=ParentStageType%E2%80%8E',
			stalledTimerSesc: 1000*60*15, //15min
		};
		this.opts = Object.assign({}, defOpts, opts);
		//this.opts.appUrl = this.opts.baseUrl + '/build/' + this.opts.appQuery;
		//this.opts.fileUrl = 'file://' + __dirname + '/app/build/production/CGA/index.html' + this.opts.appQuery;

		this.domInst = null;
		this.dom = null;

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

	mw_run (opts) {
		this.run(opts)
		.then(domInst => {
			this.process.emit("answ_run", {
				info: domInst.info,
			});
		})
		.catch(err => {
			this.process.emit("error", err);
		});
	}

	mw_save (opts) {
		this.save(opts)
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
			args
		});

		if (args.length && this.isEndMessage(args[0])) {
			this.onAppFinished(args[0]);
		}
	}

	isEndMessage(msg) {
		return (
			typeof msg == 'object' 
			&& msg.fullMessage !== undefined
			&& msg.message !== undefined
			&& msg.errorLevel !== undefined
		);
	}

	onInitDataLoad () {
    	this.restartStalledTimer();
        if (this.consoleListener)
            this.consoleListener.log('_onInitDataLoad');
	}

	onAppFinished (msg) {
    	this.stopStalledTimer(); //finish!
        if (this.consoleListener)
            this.consoleListener.log('_onAppFinished', msg);
        setTimeout(() => { //wait a bit more for sure..
            this.endDate = new Date();
            let elapsedTime = (this.endDate - this.startDate) / 1000;
            if (this.consoleListener)
                this.consoleListener.log('app finished in ' + elapsedTime + ' sec');
            let info = {};
            info.elapsedTime = elapsedTime;
            let domInst = {dom: this.dom, info};
            this.domInst = domInst;
			this.emit('finished', domInst);
        }, 1000*5);
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

	save (cmdOpts) {
	    return new Promise((resolve, reject) => {
			if (!this.domInst)
				throw new Error("No DOM instance!");
	    	try {
	    		if (cmdOpts.inVM === undefined || cmdOpts.inVM) {
                    console.log('save...a1');
		            var saveScript = new Script(`Ext.ComponentQuery.query("advanced-viewport")[0].getController().onSaveChanges();`);
                    console.log('save...a2');
		            this.domInst.dom.runVMScript(saveScript);
                    console.log('save...a3');
		            resolve({saved: 1});
	        	} else {
                    console.log('save...b1');
                    let window = this.domInst.dom.window;
                    let Ext = window.Ext;
	        		Ext.ComponentQuery.query("advanced-viewport")[0].getController().onSaveChanges();
                    console.log('save...b2');
                    resolve({saved: 1});
	        	}
        	} catch (err) {
        		reject(err);
        	}
	    });
	}

	destroy () {
		this.domInst = null;
	}

	/*
	serializeHtml () {
		let opts = this.opts;
	    return new Promise((resolve, reject) => {
			if (!this.domInst)
				throw new Error("No DOM instance!");
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
	*/

	run (cmdOpts) {
		this.destroy();
		let opts = this.opts;
        this.startDate = new Date();

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
        var q = this.opts.appQuery + '&projectId=' + cmdOpts.pid + '&sessionId=' + cmdOpts.sid;
        console.log('q = ', q);
        var appUrl = this.opts.baseUrl + '/build/' + q;
        let url = opts.runAppFromFileProtocol ? opts.filePath + q : appUrl;
        this.restartStalledTimer();
        let prom = opts.runAppFromFileProtocol ? 
            JSDOM.fromFile(opts.filePath, jsdomOptions) : 
            JSDOM.fromURL(appUrl, jsdomOptions);
        return prom.then(dom => {
        	this.dom = dom;
        	this.restartStalledTimer();
	    	return new Promise((resolve, reject) => {
	            var window = dom.window;
	            //window.sessionId = cmdOpts.sid;
	            if (opts.runAppFromFileProtocol)
	                window.location.search = q;
	            if (opts.consoleListener)
	                opts.consoleListener.log('url loaded', url);
	            window.localStorage = new Storage(null, { strict: false, ws: '  ' });
	            window.sessionStorage = new Storage(null, { strict: true });
	            this.once('stalled', (info) => {
	            	reject({
	            		message: "Stalled", 
	            		info: info
	            	});
	            });
	            this.once('finished', (domInst) => {
	            	resolve(domInst);
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
