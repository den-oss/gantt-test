# gantt-test
Experimental running ExtJs app @ NodeJs

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
## Project structure
- app.js  # Entry point. Runs Express server and socker-io server
- config.js
- gantt-app  # Original ExtJs Gantt app, can be run on client-side in browser
- app  # Express app code
  - checkAuthMiddleWare.js
  - passport.js
  - routes.js
  - socket.js
- lib  # Core code for running ExtJs app on NodeJs
  - EmfProcess.js
  - manager.js
  - processer.js
  - worker.js
- views  # Views templates for Express
  - index.ejs
  - client.ejs
  - login.ejs
  - profile.ejs
## Express
...
## lib
`class EmfProcess`
Wrapper for process, handles events from anf to process
`class GntManager`
Contains workers (instances of `EmfProcess` which contains process workers - forks of `worker.js`).
Can kill workers, send command messages to workers.
`class GntProcesser`
Core class that can run client js code on server-side. Should be created in separate worker process (`worker.js`).
`worker.js`
Worker (separate process). Creates instance of GntProcesser and gives control to it.
## Save
Code is called on vm: 
`Ext.ComponentQuery.query("advanced-viewport")[0].getController().onSaveChanges();`

# App
http://gantt-test.herokuapp.com/

# Auth
login: denis
pass: 123

login: yishay
pass: 123


