const ServiceBroker = require("../src/service-broker");

const broker = new ServiceBroker({
	logger: false,
	cacher: "Redis",

	created(broker) {
		broker.localBus.on("*.error", payload => {
			console.error("locaBus error", payload);
		});
	}
});

broker.createService({
	name: "error-tracker",

	events: {
		"$**.error": {
			handler(ctx) {
				console.error("error tracker error", ctx.params);
			}
		}
	}
});

broker.start().catch(err => broker.logger.error(err));
