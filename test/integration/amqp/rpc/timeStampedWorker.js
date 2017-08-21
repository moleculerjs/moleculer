/* eslint-disable no-console */

const {
	ServiceBroker,
	Transporters: { AMQP: AmqpTransport }
} = require("../../../..");
const AMQP_URL = process.env.AMQP_URI || "amqp://guest:guest@localhost:5672";

const amqpTransporter = new AmqpTransport(AMQP_URL);
const broker = new ServiceBroker({
	nodeID: "timestamped-nodeID",
	logger: console,
	transporter: amqpTransporter,
});

broker.createService({
	name: "testing",
	actions: {
		hello: {
			params: {
				cmd: { type: "string" }
			},
			handler(ctx) {
				console.log("timestampedWorker responding to", ctx.params.cmd);
				console.log("received", Date.now());
				return new Promise((resolve) => {
					setTimeout(() => {
						console.log("responded", Date.now());
						resolve({ msg: ctx.params.cmd, from: "timestampedWorker" });
					}, 1000);
				});
			},
		},
	},
});

broker.start();

setTimeout(() => process.exit(1), 10000);
