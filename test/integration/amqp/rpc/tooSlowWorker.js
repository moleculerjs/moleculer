/* eslint-disable no-console */

const { ServiceBroker } = require("../../../..");
const broker = new ServiceBroker({
	nodeID: "too-slow-nodeID",
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
				return new Promise((resolve) => {
					setTimeout(() => {
						resolve({ msg: ctx.params.cmd, from: "too-slow" });
						console.log("responded", ctx.params.cmd);
					}, 9000);
				});
			},
		},
	},
});

broker.start();

setTimeout(() => process.exit(1), 8000);
