/* eslint-disable no-console */

"use strict";

let { times, random, padStart } = require("lodash");

let ServiceBroker = require("../../src/service-broker");

let transporter = process.env.TRANSPORTER || "TCP";

// Create broker
let broker = new ServiceBroker({
	namespace: "loadtest",
	nodeID: process.argv[2] || "client",
	transporter,
	logger: console,
	logLevel: "warn",
	//metrics: true,
	requestTimeout: 10000,
});

console.log("Client started. nodeID:", broker.nodeID, " TRANSPORTER:", transporter, " PID:", process.pid);
/*
function work() {
	let payload = { a: random(0, 100), b: random(0, 100) };
	const p = broker.call("math.add", payload)
		.then(() => broker._callCount++)
		.catch(err => console.warn(err.message));
		//.then(() => setImmediate(work));

	//* Overload
	if (broker.transit.pendingRequests.size < 2 * 1000)
		setImmediate(work);
	else
		p.then(() => setImmediate(work));

}*/

let counter = 0;
let errorCount = 0;

function work2() {
	let payload = { c: ++counter/*, id: broker.nodeID*/ };
	const p = broker.call("perf.reply", payload)
		.then(() => broker._callCount++)
		.catch(err => {
			console.warn(err.message, " Counter:", payload.c);
			errorCount++;
		});
		//.then(() => setImmediate(work2));

	//* Overload
	if (broker.transit.pendingRequests.size < 2 * 1000)
		setImmediate(work2);
	else
		p.then(() => setImmediate(work2));

}

broker._callCount = 0;

broker.start()
	.then(() => broker.waitForServices("perf"))
	.then(() => {
		setTimeout(() => {
			let startTime = Date.now();
			work2();

			setInterval(() => {
				if (broker._callCount > 0) {
					let rps = broker._callCount / ((Date.now() - startTime) / 1000);
					console.log(broker.nodeID, ":",
						padStart(Number(rps.toFixed(0)).toLocaleString(), 10), "req/s",
						"    Queue:", padStart(Number(broker.transit.pendingRequests.size.toFixed(0)).toLocaleString(), 8),
						"   Errors:", padStart(Number(errorCount.toFixed(0)).toLocaleString(), 8)
					);
					broker._callCount = 0;
					startTime = Date.now();
				}
			}, 1000);

		}, 1000);
	});
