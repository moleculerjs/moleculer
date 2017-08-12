const {
	ServiceBroker,
	Transporters: { AMQP: AmqpTransport }
} = require("../../../..");
const AMQP_URL = "amqp://guest:guest@localhost:5672";

const amqpTransporter = new AmqpTransport(AMQP_URL);
const broker = new ServiceBroker({
	nodeID: "worker2-nodeID",
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
				console.log("worker2 responding to", ctx.params.cmd);
				return Promise.resolve({ msg: ctx.params.cmd, from: "worker2" });
			},
		},
	},
});

broker.start();

setTimeout(() => process.exit(1), 10000);