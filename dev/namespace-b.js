"use strict";

const ServiceBroker = require("../src/service-broker");

const broker = new ServiceBroker({
	namespace: "projectB",
	nodeID: "node-1",
	transporter: "NATS",
});

// Example greeter service in namespace "projectB"
broker.createService({
	name: "greeter",
	actions: {
		hello(ctx) {
			return "Hello from Project B!";
		}
	}
});

broker.start().then(() => {
	broker.repl();
});
