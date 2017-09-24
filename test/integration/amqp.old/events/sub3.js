/* eslint-disable no-console */

const { ServiceBroker } = require("../../../..");

const broker = new ServiceBroker({
	nodeID: "event-sub3-nodeID",
	logger: console,
	transporter: process.env.AMQP_URI || "amqp://guest:guest@localhost:5672",
});

broker.createService({
	name: "bService",
	events: {
		"hello.world": function() {
			console.log("Subscriber3 received the event.");
		},
	}
});

setTimeout(() => process.exit(1), 10000);

broker.start();
