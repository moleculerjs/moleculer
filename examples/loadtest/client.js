/* eslint-disable no-console */

"use strict";

let random = require("lodash/random");

let ServiceBroker = require("../../src/service-broker");
let Transporters = require("../../src/transporters");

// Create broker
let broker = new ServiceBroker({
	nodeID: process.argv[2] || "client",
	transporter: new Transporters.NATS(process.env.NATS_SERVER),
	//logger: console
});

//broker.loadService(__dirname + "/../math.service");

broker.start();

console.log("Client started. nodeID:", broker.nodeID, " PID:", process.pid);

function work() {
	let payload = { a: random(0, 100), b: random(0, 100) };
	broker.call("math.add", payload)
	.then(res => {
		broker._callCount++;
		//console.info(`${payload.a} + ${payload.b} = ${res}`);
		setImmediate(work);
	});		
}

broker._callCount = 0;
setTimeout(() => { 
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
