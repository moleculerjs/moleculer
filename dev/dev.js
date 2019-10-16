const ServiceBroker = require("../src/service-broker");


const broker = new ServiceBroker({
	nodeID: "broker-1",
	transporter: {
		type: "NATS",
		options: {
			user: "icebob",
			pass: "password"
		}
	}
});

async function start() {
	await broker.start();

}

start();
