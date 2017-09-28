/* eslint-disable no-console */

"use strict";

let { times, random, padStart } = require("lodash");

let ServiceBroker = require("../../src/service-broker");

// Create broker
let broker = new ServiceBroker({
	nodeID: process.argv[2] || "client",
	transporter: process.env.TRANSPORTER || "NATS",
	logger: console,
	logLevel: "warn",
	//metrics: true,
	requestTimeout: 10000,
});

console.log("Client started. nodeID:", broker.nodeID, " PID:", process.pid);

function work() {
	let payload = { a: random(0, 100), b: random(0, 100) };
	const p = broker.call("math.add", payload)
		.then(() => broker._callCount++)
		.catch(err => console.warn(err.message));

	if (broker.transit.pendingRequests.size < 1 * 1000)
		setImmediate(work);
	else
		p.then(() => setImmediate(work));
}

broker._callCount = 0;

broker.start()
	.then(() => broker.waitForServices("math"))
	.then(() => {
		setTimeout(() => {
			let startTime = Date.now();
			work();

			setInterval(() => {
				if (broker._callCount > 0) {
					let rps = broker._callCount / ((Date.now() - startTime) / 1000);
					console.log(broker.nodeID, ":", padStart(Number(rps.toFixed(0)).toLocaleString(), 10), "req/s", "    Queue: " + padStart(Number(broker.transit.pendingRequests.size.toFixed(0)).toLocaleString(), 8));
					broker._callCount = 0;
					startTime = Date.now();
				}
			}, 1000);

		}, 1000);
	});
