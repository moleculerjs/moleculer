"use strict";

let _ = require("lodash");
let ServiceBroker = require("../../src/service-broker");
let { MoleculerError } = require("../../src/errors");

// Create broker
let broker = new ServiceBroker({
	namespace: "multi",
	nodeID: process.argv[2] || "server-" + process.pid,
	transporter: "NATS",
	serializer: "ProtoBuf",

	logger: console
});

broker.createService({
	name: "math",
	actions: {
		add(ctx) {
			if (_.random(100) > 90)
				return this.Promise.reject(new MoleculerError("Random error!", 510));

			return Number(ctx.params.a) + Number(ctx.params.b);
		},
	}
});

broker.start()
	.then(() => broker.repl());
