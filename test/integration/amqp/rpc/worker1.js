/* eslint-disable no-console */

const {
	ServiceBroker,
	Transporters: { AMQP: AmqpTransport }
} = require("../../../..");
const AMQP_URL = process.env.AMQP_URI || "amqp://guest:guest@localhost:5672";

const amqpTransporter = new AmqpTransport(AMQP_URL);
const broker = new ServiceBroker({
	nodeID: "worker1-nodeID",
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
				console.log("worker1 responding to", ctx.params.cmd);
				return Promise.resolve({ msg: ctx.params.cmd, from: "worker1" });
			},
		},
	},
});

broker.start();

setTimeout(() => process.exit(130), 10000);
