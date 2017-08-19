/* eslint-disable no-console */

const {
	ServiceBroker,
	Transporters: { AMQP: AmqpTransport }
} = require("../../../..");
const AMQP_URL = process.env.AMQP_URI || "amqp://guest:guest@localhost:5672";

const amqpTransporter = new AmqpTransport(AMQP_URL);
const broker = new ServiceBroker({
	nodeID: "slow-nodeID",
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
				console.log("slowWorker responding to", ctx.params.cmd);
				return new Promise((resolve) => {
					setTimeout(() => {
						resolve({ msg: ctx.params.cmd, from: "slowWorker" });
					}, 4000);
				});
			},
		},
	},
});

broker.start();

setTimeout(() => process.exit(1), 10000);
