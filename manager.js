const child_process = require('child_process');
const EmfProcess = require("./EmfProcess");

class GntManager {

	constructor() {
		this.workers = {};
		this.workersCnt = 0;
		this.workersClientIdToId = {};
	}

	createWorker (opts, clientId = null, cns = null) {
		this.workersCnt++;
		let id = this.workersCnt;
		let worker = child_process.fork(__dirname + '/worker.js');
		let w = new EmfProcess({
		    process: worker,
		    id: id,
		    clientId: clientId,
		});
        w.cns = cns;
		w.on('error', (err) => {
		  console.error('[Worker#'+w.id+']', err);
		});
		w.once('exit', (code, signal) => {
		  console.log('[Worker#'+w.id+']' + ' Exited with code ' + code);
		});
		this.workers[id] = w;
		if (clientId)
			this.workersClientIdToId[clientId] = w.id;

		w.emit('create', {
          workerId: w.id,  
          opts: opts,
        });
        return new Promise((resolve, reject) => {
          w.once('created', () => {
            resolve(w);
          });
        });
	}

	getOrCreateWorkerForClient (clientId, createOpts, cns = null) {
		let w = this.getWorkerForClient(clientId);
		if (!w)
			return this.createWorker(createOpts, clientId, cns);
		else
			return Promise.resolve(w);
	}

	getWorkerForClient (clientId) {
		let wid = this.workersClientIdToId[clientId];
		return this.workers[wid];
	}

	killWorker (w) {
		w.emit('kill');
        this.workers[w.id] = null;
	}

	workerCmd(w, cmd, opts) {
		return new Promise((resolve, reject) => {
			w.emit(cmd, opts);
			w.once('error', err => {
				reject(err);
                this.killWorker(w);
			});
			w.once('exit', (code, signal) => {
				reject(new Error("Exited with code " + code));
			});
			w.once('answ_'+cmd, data => {
				resolve(data);
			});
			w.on('console', ({type, args}) => {
                if (w.cns)
				    w.cns[type](...args);
			});
		});
	}

}


module.exports = GntManager;
