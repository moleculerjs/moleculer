/* eslint-disable no-console */

"use strict";

let random = require("lodash/random");
let os = require("os");
let hostname = os.hostname();

let ServiceBroker = require("../../src/service-broker");

// Create broker
let broker = new ServiceBroker({
	nodeID: process.argv[2] || hostname + "-server",
	//logger: console
	//metrics: true
});

broker.loadService(__dirname + "/../math.service");
broker.loadService(__dirname + "/../rest.service");

broker.start();

console.log("Server started. nodeID: ", broker.nodeID, ", PID:", process.pid);

let payload = { a: random(0, 100), b: random(0, 100) };

function work() {
	broker.call("math.add", payload).then(res => {
		if (broker._callCount++ % 10000) {
			// Fast cycle
			work();
		} else {
			// Slow cycle
			setImmediate(() => work());
		}
		return res;

	}).catch(err => {
		throw err;
	});
}

broker._callCount = 0;
setTimeout(() => {
	console.log("Client started. nodeID:", broker.nodeID, " PID:", process.pid);

	let startTime = Date.now();
	work();

	setInterval(() => {
		if (broker._callCount > 0) {
			let rps = broker._callCount / ((Date.now() - startTime) / 1000);
			console.log(broker.nodeID, ":", rps.toFixed(0), "req/s");
			broker._callCount = 0;
			startTime = Date.now();
		}
	}, 1000);

}, 1000);