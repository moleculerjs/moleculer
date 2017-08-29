"use strict";

let path = require("path");
let _ = require("lodash");
let ServiceBroker = require("../../src/service-broker");
let { MoleculerError } = require("../../src/errors");

// Create broker
let broker = new ServiceBroker({
	//namespace: "multi",
	nodeID: process.argv[2] || "server-" + process.pid,
	transporter: "NATS",
	//serializer: "ProtoBuf",
	logger: console
});

//broker.loadService(path.join(__dirname, "..", "file.service"));

broker.createService({
	name: "math",
	actions: {
		add(ctx) {
			if (_.random(100) > 90)
				return this.Promise.reject(new MoleculerError("Random error!", 510));

			return Number(ctx.params.a) + Number(ctx.params.b);
		},
	},

	events: {
		"echo.event"(data, sender) {
			broker.logger.info(`Echo event received from ${sender}. Counter: ${data.counter}. Send reply...`);
			this.broker.emit("reply.event", data);
		}
	}
});

broker.start()
	.then(() => {
		setInterval(() => broker.transit.sendPing(), 10 * 1000);
	})
	.then(() => broker.repl());
