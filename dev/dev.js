const ServiceBroker = require("../src/service-broker");

const broker = new ServiceBroker({
	nodeID: "broker-1",
	transporter: {
		type: "NATS"
	},
	metrics: true
});

async function start() {
	await broker.start();

	broker.repl();
}

start();
