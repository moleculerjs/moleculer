"use strict";

let ServiceBroker = require("../../src/service-broker");
let NatsTransporter = require("../../src/transporters/nats");

let os = require("os");
let hostname = os.hostname();

// Create broker
let broker = new ServiceBroker({
	nodeID: process.argv[2] || hostname + "-server",
	transporter: new NatsTransporter(process.argv[3]),
	//logger: console
});

broker.loadService(__dirname + "/../math.service");

broker.start();

console.log("Server started. nodeID: ", broker.nodeID, ", PID:", process.pid);

setInterval(() => {
	if (broker._callCount > 0) {
		console.log(broker.nodeID, ":", broker._callCount, " req/s");
		broker._callCount = 0;
	}
}, 1000);