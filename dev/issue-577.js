const { ServiceBroker } = require("../");

const brokerConfig = {
	metrics: false,
	cacher: {
		type: "Memory",
	},
	registry: {
		strategy: "Latency",
		strategyOptions: {
			sampleCount: 5,
			lowLatency: 10,
			collectCount: 5,
			pingInterval: 10,
		},
	},
	transporter: "TCP",
};

const broker = new ServiceBroker(brokerConfig);

function genService(sSount, aCount) {
	// create and attach some services
	for (let i = 0; i < sSount; i += 1) {
		const service = {
			name: `service${i}`,
			actions: {},
		};

		// create some actions on this service
		for (let j = 0; j < aCount; j += 1) {
			service.actions[`test${j}`] = {
				handler: (ctx) => {
					const { a, b } = ctx.params;
					return a + b;
				},
			};
		}

		// attach service to broker
		broker.createService(service);
	}
}

genService(10, 10);
broker.start().catch(err => console.error(err));
