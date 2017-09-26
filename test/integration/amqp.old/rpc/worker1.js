/* eslint-disable no-console */

const { ServiceBroker } = require("../../../..");
const broker = new ServiceBroker({
	nodeID: "worker1-nodeID",
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
				console.log("worker1 responding to", ctx.params.cmd);
				return Promise.resolve({ msg: ctx.params.cmd, from: "worker1" });
			},
		},
	},
});

broker.start();

setTimeout(() => process.exit(130), 10000);
