"use strict";

const ServiceBroker = require("../src/service-broker");

const broker = new ServiceBroker({
	logFormatter: "simple",
	circuitBreaker: {
		enabled: true,
		minRequestCount: 2,
		windowTime: 5,
		halfOpenTime: 1000
	}
});

broker.createService({
	name: "greeter",
	actions: {
		hello(ctx) {
			const err = new Error("Hi! I'm a server error!");
			err.code = 500;
			throw err;
		}
	}
});

broker.start().then(() => {
	setInterval(() => {
		broker
			.call(
				"greeter.hello",
				{ name: "CodeSandbox" },
				{
					fallbackResponse: () => {
						broker.logger.info("Fallback Invoked!");
						return "Fallback Response";
					}
				}
			)
			.then(res => broker.logger.info(res, new Date()))
			.catch(err => broker.logger.error(err.message));
	}, 1000);
});
