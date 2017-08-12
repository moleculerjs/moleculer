const {
	ServiceBroker,
	Transporters: { AMQP: AmqpTransport }
} = require("../../../..");
const AMQP_URL = "amqp://guest:guest@localhost:5672";

const amqpTransporter = new AmqpTransport(AMQP_URL);
const broker = new ServiceBroker({
	nodeID: "single-request-nodeID",
	logger: console,
	transporter: amqpTransporter,
});

broker.start();

setTimeout(() => process.exit(1), 10000);

const messageID = process.argv[2] || Date.now();

setTimeout(() => {
	broker.call("testing.hello", { cmd: "request" + messageID })
		.then(console.log);
}, 1000);
