/**
 * Don't use this directly!
 * It's spawned child worker process
 *
 * @author ukrbublik
 */

const child_process = require('child_process');
const GntProcesser = require('./processer');
const EmfProcess = require('./EmfProcess');

var emfProcess = new EmfProcess();
var prc = null;
var alive = true;

setInterval(() => {
  if (!alive)
    process.exit(0);
}, 1000);

emfProcess.once('create', (data) => {
  //console.log('[Worker#'+data.workerId+']', 'Initing');
  //prc сам подпишется на события процесса emfProcess и будет на них отвечать
  prc = new GntProcesser(data.opts, data.workerId, emfProcess);
  emfProcess.emit('created');
});


process.on('unhandledRejection', function (err) {
  console.error('[Worker#'+(prc ? prc.workerId : '?')+'] unhandledRejection', err);
  emfProcess._emit('kill');
});
process.on('uncaughtException', function (err) {
  console.error('[Worker#'+(prc ? prc.workerId : '?')+'] uncaughtException', err);
  emfProcess._emit('kill');
});

emfProcess.on('kill', () => {
  if (prc) {
    prc.destroy();
    prc = null;
  }
  alive = false;
});
