const ServiceBroker = require("../src/service-broker");

const brokerConfig = {
	logLevel: "error",
	transporter: "Redis"
};

function createServices() {
	const broker1Services = [];
	for (let i = 0; i < 1000; i++) {
		broker1Services.push({
			name: `broker1-service${i}`
		});
	}

	const broker2Services = [];
	for (let i = 0; i < 1000; i++) {
		broker2Services.push({
			name: `broker2-service${i}`
		});
	}

	return {
		broker1Services,
		broker2Services
	};
}

async function benchmark() {
	console.log("Starting brokers...");
	const { broker1Services, broker2Services } = createServices();

	const broker1 = new ServiceBroker({
		nodeID: "node-1",
		...brokerConfig
	});

	const broker2 = new ServiceBroker({
		nodeID: "node-2",
		...brokerConfig
	});

	for (const service of broker1Services) {
		broker1.createService(service);
	}
	for (const service of broker2Services) {
		broker2.createService(service);
	}

	console.time("Startup time");
	await Promise.all([broker1.start(), broker2.start()]);
	console.timeLog("Startup time");
	await Promise.all([broker1.stop(), broker2.stop()]);
}

benchmark();
