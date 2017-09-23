/* eslint-disable no-console */

const { ServiceBroker } = require("../../../..");

const broker = new ServiceBroker({
	nodeID: "event-pub-nodeID",
	logger: console,
	transporter: process.env.AMQP_URI || "amqp://guest:guest@localhost:5672",
});

broker.createService({
	name: "pub",
	events: {
		"hello.world"() {
			console.log("Publisher received the event.");
		}
	}
});

setTimeout(() => process.exit(1), 10000);

broker.start();
setTimeout(() => broker.broadcast("hello.world", { testing: true }), 1000);
