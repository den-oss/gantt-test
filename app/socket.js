const GntManager = require("../lib/manager");
const passportSocketIo = require("passport.socketio");
const config = require("../config");
var gm = new GntManager();

module.exports = function(io, sessionStore, sessionMiddleware) {

	//Doesn't work:
	//https://github.com/jfromaniello/passport.socketio/issues/110
	/*
	io.use(passportSocketIo.authorize({
	  cookieParser: require('cookie-parser'),
      key:          config.sessionKey,
      store:        sessionStore,
	  secret:       config.sessionSecret, 
	  success:      onAuthorizeSuccess,
	  fail:         onAuthorizeFail,
	}));

	function onAuthorizeSuccess(data, accept){
	  console.log('successful connection to socket.io');

	  // The accept-callback still allows us to decide whether to
	  // accept the connection or not.
	  //accept(null, true);

	  // OR

	  // If you use socket.io@1.X the callback looks different
	  accept();
	}

	function onAuthorizeFail(data, message, error, accept){
	  //if(error)
	  //  throw new Error(message);
	  console.log('failed connection to socket.io:', message, error);

	  // We use this callback to log all of our failed connections.
	  //accept(null, false);

	  // OR

	  // If you use socket.io@1.X the callback looks different
	  // If you don't want to accept the connection
	  if(error)
	    accept(new Error(message));
	  // this error will be sent to the user as a special error-package
	  // see: http://socket.io/docs/client-api/#socket > error-object
	}
	*/

	io.use(function(socket, next) {
    	sessionMiddleware(socket.request, socket.request.res, next);
	});

	io.on('connection', function (socket) {
	  let keepConnTimer;
      let pass = socket.request.session.passport;
	  console.log('client connected', socket.id, pass);
	  if (!pass) {
	  	//Unauthorized!
	  	socket.disconnect();
	  } else {
		  keepConnTimer = setInterval(() => {
		    socket.emit('app_ping');
		  }, 1000*5);
	  }

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
