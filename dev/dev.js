const ServiceBroker = require("../src/service-broker");


const broker = new ServiceBroker({
	nodeID: "broker-1",
	logLevel: "info"
});

async function start() {
	await broker.start();

	broker.repl();

}

start();
