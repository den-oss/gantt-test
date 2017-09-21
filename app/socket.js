const GntManager = require("../lib/manager");
var gm = new GntManager();

module.exports = function(io) {

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

	  socket.on('app_stop', function (data) {
	    console.log('['+socket.id+']', 'app_stop', data);
	    let w = gm.getWorkerForClient(socket.id);
	    if (w) {
	        let wid = w.id;
	        gm.killWorker(w);
	    }
	  });

	  socket.on('app_save', function (data) {
	    console.log('['+socket.id+']', 'app_save', data);
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

};
