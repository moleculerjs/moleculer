const ServiceBroker = require("../src/service-broker");


const broker = new ServiceBroker({
	nodeID: "broker-1",
	transporter: "TCP",
	logLevel: "info"
});

async function start() {
	await broker.start();

}

start();
