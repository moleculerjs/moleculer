/* eslint-disable no-console */

"use strict";

let os = require("os");
let ServiceBroker = require("../src/service-broker");

let broker = new ServiceBroker({
	nodeID: os.hostname() + "-" + process.pid,
	logger: true,
	logLevel: "info",
	transporter: "nats://norbi-pc2:4222"
});

broker.createService({
	name: "math",
	actions: {
		add: {
			handler(ctx) {
				this.logger.info("Incoming request", ctx.params);
				return {
					worker: this.broker.nodeID,
					value: Number(ctx.params.a) + Number(ctx.params.b),
				};
			}
		}
	}
});

broker.start()
	.then(() => broker.repl());
