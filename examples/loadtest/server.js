/* eslint-disable no-console */

"use strict";

let ServiceBroker = require("../../src/service-broker");
let { padStart } = require("lodash");

let os = require("os");
let hostname = os.hostname();

let transporter = process.env.TRANSPORTER || "TCP";

let sum = 0;
let maxTime = null;

// Create broker
let broker = new ServiceBroker({
	namespace: "loadtest",
	nodeID: process.argv[2] || hostname + "-server",
	transporter,
	logger: console,
	logLevel: "warn"
	//metrics: true
});

broker.createService({
	name: "math",
	actions: {
		add(ctx) {
			broker._callCount++;
			return Number(ctx.params.a) + Number(ctx.params.b);
		}
	}
});

broker.createService({
	name: "perf",
	actions: {
		reply(ctx) {
			broker._callCount++;
			return ctx.params;
		}
	}
});
//broker.loadService(__dirname + "/../rest.service");

broker.start();

console.log("Server started. nodeID: ", broker.nodeID, " TRANSPORTER:", transporter, " PID:", process.pid);

broker._callCount = 0;
setInterval(() => {
	if (broker._callCount > 0) {
		console.log(broker.nodeID, ":", padStart(Number(broker._callCount.toFixed(0)).toLocaleString(), 8), "req/s");
		broker._callCount = 0;
	}
}, 1000);
