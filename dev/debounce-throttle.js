"use strict";

const ServiceBroker = require("../src/service-broker");

const broker = new ServiceBroker({
	logger: true
});

broker.createService({
	name: "test",
	events: {
		debounce: {
			debounce: 5000,
			handler(ctx) {
				this.logger.info("Debounced event received.");
			}
		},
		throttle: {
			throttle: 5000,
			handler(ctx) {
				this.logger.info("Throttled event received.");
			}
		}
	}
});

broker.start().then(() => broker.repl());
