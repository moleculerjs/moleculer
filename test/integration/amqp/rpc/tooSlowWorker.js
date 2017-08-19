/* eslint-disable no-console */

const {
	ServiceBroker,
	Transporters: { AMQP: AmqpTransport }
} = require("../../../..");
const AMQP_URL = process.env.AMQP_URI || "amqp://guest:guest@localhost:5672";

const amqpTransporter = new AmqpTransport(AMQP_URL);
const broker = new ServiceBroker({
	nodeID: "too-slow-nodeID",
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
