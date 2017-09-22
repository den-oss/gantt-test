
# Requirements
We have a page that runs Bryntum gantt over our information.
We want to test an option to run that page on a nodeJs server as a gantt engine.
As we see it we will need to solve several issue through this project, but first we want a prototype that:
1. Runs our uglifled solution on nodeJs Server.
2. We can access a page on that server that asks for login (user + password).
3. Shows a list of projects to select from (query over project object).
4. After selecting a project does the logic on the server side that whould have been done on client side and shows a loading sign until process is finsihed.
5. Shows a "save" button that on click does the "save" logic from our solution.

Simplified Requirements:
1. Runs our uglifled solution on nodeJs Server.
2. We can access a page on your server that has two inputs:
2.1. Token.
2.2. Project Id
3. The page will have two buttons:
3.1. load - does the logic on the server side that whould have been done on client side and shows a loading sign until process is finsihed - on finish shows how much time it took.
3.2. save - on click does the "save" logic from our solution.

# What has been done?
- Running ExtJs Gantt app on server-side (NodeJs)
- Page (described at requirements) with 2 inputs: 
  - project id
  - session id
  
  and 3 buttons: 
  - Run (run gantt app on server-side)
  - Stop (stop running process)
  - Save (run save login on server-side)
- Page is protected with simple authorization by login & password pair, see #Auth

Note: Save logic no longer works after no-UI modifying of Gantt app. It worked with previous with-UI version of Gantt app.

# How it works?
On `/client` page communication with server is done with help of sockets.

On server each gantt app instance will be run on separate worker process. 

Running client js code on server-side itself is done with help of `jsdom` lib which simulates browser's DOM. If code is not working with DOM, this approach will not regress the performance (running time on Nodejs is nearly equal to one on browser).
We can't get rid of `jsdom` completely because app uses jQuery.

## Project structure
- `app.js`   *Entry point. Runs Express server and socker-io server*
- `config.js`
- `gantt-app`   *Original ExtJs Gantt app, can be run on client-side in browser*
- `app`  *Express app code*
  - `checkAuthMiddleWare.js`
  - `passport.js`   *Authenticating with Passport*
  - `routes.js`   *Express routes: / /login /client /profile /logout*
  - `socket.js`   *socket.io server*
- `lib`   *Core code for running ExtJs app on NodeJs. See below*
  - `EmfProcess.js`
  - `manager.js`
  - `processer.js`   *core class*
  - `worker.js`
- `views`   *Views templates for Express*
  - `index.ejs`
  - `client.ejs`   *page with proj/session ids inputs, run/stop/save buttons*
  - `login.ejs`
  - `profile.ejs`

## /app/socket.js
- `app_ping` event is used just to prevent socket shutdown on Heroku cloud.
- `app_run` is triggered from client by clicking on 'Run'. Will create worker process by calling `gm.getOrCreateWorkerForClient()` and start gantt app on it by calling `gm.workerCmd(w, 'run', cmdOpts)`. See class `GntProcesser` for explantion. When app running process will be completed, server will send `app_run_done` event to client. Or will send `app_error` event on error.
- Client can trigger `app_stop` event to stop running process (will terminate worker process by `gm.killWorker()`).
- After app loaded client can trigger `app_save` event. Server will run gantt app's save code on worker process (see #Save) by
`gm.workerCmd(w, 'save')`. Will send `app_save_done` on complete.

## /lib
- `class EmfProcess`

Just wrapper for process, adds EventEmitter functionality to it.
- `class GntManager`

Contains workers (this.workers) - instances of `EmfProcess` which contains process workers - forks (see `child_process.fork()`) of `worker.js`.
Can create, kill workers, send command messages to them.
- `worker.js`

Worker (separate node process). On creation will create instance of `GntProcesser` and give control to it. That's all.
- `class GntProcesser`

Core class that can run client js code on server-side. Should be created and run in separate worker process (`worker.js`).
On `run` event will call `run()` method (`answ_run` is callback eventto resolve `GntManager.workerCmd()`), on `save` - `save()`.

## GntProcesser.run()
Loads full gantt app from dir `gantt-app` via `JSDOM.fromFile('./gantt-app/build/production/CGA/index.html')`.
App code will be run in VM (sandbox). All resources (js files) will be loaded automatically from contents of `index.html` by JSDOM.
Also reates `new jsdom.VirtualConsole()` to catch console messages from VM and transfers to client (see `GntProcesser.onConsole()`, `GntManager.workerCmd()` - `w.on('console', ..)`). 
To know when gantt app loads (see `onAppFinished()`) I'am analyzing console messages to catch the final one (`isEndMessage()`).
Tip: stalled timer is used just to detect possible freezing of gantt app (if it runs too slow).

## GntProcesser.save()
Code is called on vm: 
`Ext.ComponentQuery.query("advanced-viewport")[0].getController().onSaveChanges();`

# App
http://gantt-test.herokuapp.com/

# Auth
login: denis
pass: 123

login: yishay
pass: 123


