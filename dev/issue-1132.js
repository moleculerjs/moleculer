const ServiceBroker = require("../src/service-broker");

const brokerConfig = {
	logLevel: "error",
	transporter: "NATS"
};

async function benchmark() {
	console.log("Starting brokers...");

	const broker1 = new ServiceBroker({
		nodeID: "node-1",
		...brokerConfig
	});

	const broker2 = new ServiceBroker({
		nodeID: "node-2",
		...brokerConfig
	});

	for (let i = 0; i < 1000; i++) {
		broker1.createService({
			name: `broker1-service${i}`
		});
	}
	for (let i = 0; i < 1000; i++) {
		broker2.createService({
			name: `broker2-service${i}`
		});
	}

	console.time("Startup time");
	await Promise.all([broker1.start(), broker2.start()]);
	console.timeLog("Startup time");
	await Promise.all([broker1.stop(), broker2.stop()]);
}

benchmark();
