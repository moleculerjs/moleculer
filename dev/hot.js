/* eslint-disable no-console */

"use strict";

let _ = require("lodash");
let ServiceBroker = require("../src/service-broker");

// Create broker
let broker = new ServiceBroker({
	nodeID: process.argv[2] || "server-" + process.pid,
	transporter: "NATS",
	logger: console
});

broker.start();

let svc;
setTimeout(() => {
	console.log("Create math service...");

	svc = broker.createService({
		name: "math",
		actions: {
			add(ctx) {
				return Number(ctx.params.a) + Number(ctx.params.b);
			},
		}
	});

}, 5000);

setTimeout(() => {
	console.log("Destroy math service...");

	svc = broker.getService("math");
	broker.destroyService(svc);

}, 10000);
