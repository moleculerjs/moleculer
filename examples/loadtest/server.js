/* eslint-disable no-console */

"use strict";

let ServiceBroker = require("../../src/service-broker");
let Transporters = require("../../src/transporters");

let os = require("os");
let hostname = os.hostname();

// Create broker
let broker = new ServiceBroker({
	nodeID: process.argv[2] || hostname + "-server",
	transporter: new Transporters.NATS(process.env.NATS_SERVER),
	//logger: console
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
//broker.loadService(__dirname + "/../rest.service");

broker.start();

console.log("Server started. nodeID: ", broker.nodeID, ", PID:", process.pid);

broker._callCount = 0;
setInterval(() => {
	if (broker._callCount > 0) {
		console.log(broker.nodeID, ":", broker._callCount, "req/s");
		broker._callCount = 0;
	}
}, 1000);