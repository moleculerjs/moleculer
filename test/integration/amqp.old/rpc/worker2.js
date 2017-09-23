/* eslint-disable no-console */

const { ServiceBroker } = require("../../../..");

const broker = new ServiceBroker({
	nodeID: "worker2-nodeID",
	logger: console,
	transporter: process.env.AMQP_URI || "amqp://guest:guest@localhost:5672",
});

broker.createService({
	name: "testing",
	actions: {
		hello: {
			params: {
				cmd: { type: "string" }
			},
			handler(ctx) {
				console.log("worker2 responding to", ctx.params.cmd);
				return Promise.resolve({ msg: ctx.params.cmd, from: "worker2" });
			},
		},
	},
});

broker.start();

setTimeout(() => process.exit(1), 10000);
