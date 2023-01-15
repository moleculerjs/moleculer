"use strict";

const { ServiceBroker } = require("../");

const broker = new ServiceBroker({
	//namespace: "streaming",
	nodeID: "node-echo",
	transporter: "NATS",
	serializer: "JSON",
	logLevel: "debug"
});

broker.createService({
	name: "echo",
	actions: {
		reply(ctx) {
			return ctx.stream;
		}
	}
});

broker.start().then(() => broker.repl());
