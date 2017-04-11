"use strict";

let ServiceBroker = require("../src/service-broker");
let Transporters = require("../src/transporters");
let Serializer = require("../src/serializers/json");

function createBrokers(Transporter, opts) {
	let b1 = new ServiceBroker({
		transporter: new Transporter(opts),
		requestTimeout: 0,
		//logger: console,
		//logLevel: "debug",
		serializer: new Serializer(),
		nodeID: "node-1",
		
	});

	let b2 = new ServiceBroker({
		transporter: new Transporter(opts),
		//requestTimeout: 0,
		//logger: console,
		//logLevel: "debug",
		serializer: new Serializer(),
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
	return b2.call("echo.reply", { a: count }).then(res => {
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

setTimeout(() => {
	let startTime = Date.now();
	
	setInterval(() => {
		let rps = count / ((Date.now() - startTime) / 1000);
		console.log("RPS:", rps.toLocaleString("hu-HU", {maximumFractionDigits: 0}), "req/s");
		count = 0;
		startTime = Date.now();
	}, 1000);

	doRequest();

}, 500);
