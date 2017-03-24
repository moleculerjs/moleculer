"use strict";

const v8 = require('v8-natives');   

let ServiceBroker = require("../src/service-broker");
let Context = require("../src/context");
let Transporters = require("../src/transporters");

let { generateToken, json2String } = require("../src/utils");
let Promise	= require("bluebird");


function createBrokers(Transporter, opts) {
	let b1 = new ServiceBroker({
		transporter: new Transporter(opts),
		requestTimeout: 0,
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
		if (count % 10000) {
			// Fast cycle
			doRequest();
		} else {
			// Slow cycle
			setImmediate(() => doRequest());
		}
		return res;

	}).catch(err => {
		throw err;
	});
}
/*
const globalMsg = {
	nodeID: "server-2",
	requestID: generateToken(),
	action: "posts.empty",
	params: { a: 5 }
};

function doStringify() {
	const msg = {
		nodeID: "server-2",
		requestID: generateToken(),
		action: "posts.empty",
		params: { a: 5 }
	};

	count++;
	Promise.resolve(json2String(msg)).then(res => {
		if (count % 1000) 
			doStringify();
		else
			setImmediate(() => doStringify());

		return res;
	});

}*/

setTimeout(() => {
	let startTime = Date.now();
	
	setInterval(() => {
		let rps = count / ((Date.now() - startTime) / 1000);
		console.log("RPS:", rps.toLocaleString("hu-HU", {maximumFractionDigits: 0}), "req/s");
		count = 0;
		startTime = Date.now();

		//console.log("Pending:", b1.transit.pendingRequests.size);
		//v8.helpers.printStatus(b1.transit.messageHandler);
	}, 1000);

	doRequest();
	//doStringify();

}, 500);

//console.log(v8.getV8Version());
