"use strict";

let ServiceBroker = require("../src/service-broker");
let { MoleculerError } = require("../src/errors");
let _ = require("lodash");

// Create broker
let broker = new ServiceBroker({
	nodeID: "node-3",
	transporter: "NATS",
	//transporter: "amqp://192.168.51.29:5672",
	//serializer: "ProtoBuf",
	logger: console,
});

broker.createService({
	name: "test3",
	actions: {
		hello(ctx) {
			if (_.random(100) > 75)
				return this.Promise.reject(new MoleculerError("Random error!", 510));

			return `Hello from ${ctx.nodeID}`;
		}
	},

	events: {
	}
});

broker.start().then(() => {
	//broker.repl();
});
