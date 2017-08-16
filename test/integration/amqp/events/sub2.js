const { ServiceBroker, Transporters: { AMQP: AmqpTransport } } = require("../../../..");
const AMQP_URL = "amqp://guest:guest@localhost:5672";
const amqpTransporter = new AmqpTransport(AMQP_URL);

const broker = new ServiceBroker({
	nodeID: "event-sub2-nodeID",
	logger: console,
	transporter: amqpTransporter,
});

broker.createService({
	name: "aService",
	events: {
		"hello.world": function(payload) {
			console.log("Subscriber2 received the event.");
		},
	}
});

setTimeout(() => process.exit(1), 10000);

broker.start();