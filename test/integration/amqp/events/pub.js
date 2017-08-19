/* eslint-disable no-console */

const { ServiceBroker, Transporters: { AMQP: AmqpTransport } } = require("../../../..");
const AMQP_URL = process.env.AMQP_URI || "amqp://guest:guest@localhost:5672";
const amqpTransporter = new AmqpTransport(AMQP_URL);

const broker = new ServiceBroker({
	nodeID: "event-pub-nodeID",
	logger: console,
	transporter: amqpTransporter,
});

broker.on("hello.world", () => {
	console.log("Publisher received the event.");
});

setTimeout(() => process.exit(1), 10000);

broker.start();
setTimeout(() => broker.emit("hello.world", { testing: true }), 1000);
