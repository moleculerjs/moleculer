"use strict";

let ServiceBroker = require("./src/service-broker");
let Context = require("./src/context");
let Transporters = require("./src/transporters");

let { generateToken, json2String } = require("./src/utils");
let Promise	= require("bluebird");


function createBrokers(Transporter, opts) {
	let b1 = new ServiceBroker({
		transporter: new Transporter(opts),
		//requestTimeout: 0,
		//logger: console,
		//logLevel: "debug",
		nodeID: "node-1"
	});

	let b2 = new ServiceBroker({
		transporter: new Transporter(opts),
		//requestTimeout: 0,
		//logger: console,
		//logLevel: "debug",
		nodeID: "node-2"
	});

	b2.createService({
		name: "echo",
		actions: {
			reply(ctx) {
				return ctx.params;
			}
		}
	});

	b1.start().then(() => b2.start());

	return [b1, b2];
}

let [b1, b2] = createBrokers(Transporters.Fake);

let count = 0;
function doRequest() {
	count++;
	return b1.call("echo.reply", { a: count }).then(res => {
		setImmediate(() => doRequest());
	}).catch(err => {
		throw err;
	});
}

setTimeout(() => {
	doRequest();
}, 500);

setInterval(() => {
	console.log("Count:", count);
	count = 0;
}, 1000);