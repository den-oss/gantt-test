const vm = require('vm');
const fs = require('fs');

const sandbox = { 
globalVar: 1, 
window: {
navigator: {},
location: {
protocol: {}
}
},
document: {
createElement: () => {},
},
location: {
hostname: "",
},
console: {log: (...args) => { console.log(...args); }}
};
const context = vm.createContext(sandbox);

var codeJquery = fs.readFileSync("app/build/production/CGA/js/jquery.min.js");
var scriptJquery = new vm.Script(codeJquery);
var codeForcetk = fs.readFileSync("app/build/production/CGA/js/forcetk.js");
var scriptForcetk = new vm.Script(codeForcetk);
var codeBootstrap = fs.readFileSync("app/build/production/CGA/bootstrap.js");
var codeApp = fs.readFileSync("app/build/production/CGA/classic/app.js");

//console.log('jquery',codeJquery.length);
//vm.runInContext(codeJquery, sandbox);
//scriptJquery.runInContext(context);
console.log('forcetk');
vm.runInContext(codeForcetk, sandbox);
//scriptForcetk.runInContext(context);
//console.log('bootstrap');
//vm.runInContext(codeBootstrap, sandbox);
console.log('app');
vm.runInContext(codeApp, sandbox);

var codeInit = '\
var queryDict = {};\
var sessionId = "00D6A0000002RdY!AR4AQGTcUp3D8bHb71BYWOpuXRSUtuQappm_fGS6hvTECKDOQnOXWCVYkZY8TmV2bJoT8JNTdXv1zcBCycCKzdV5rzH_X5Ir";\
console.log("sessionId", sessionId);\
var client = new forcetk.Client();\
client.setSessionToken(sessionId);\
client.instanceUrl = "https://na50.salesforce.com";\
client.proxyUrl = null;\
';
vm.runInContext(codeInit, sandbox);

console.log('done');

