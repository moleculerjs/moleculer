"use strict";

const { ServiceBroker } = require("../");

const broker = new ServiceBroker({
	logger: {
		type: "Console",
		options: {
			formatter: "simple",
		}
	},
	circuitBreaker: {
		enabled: true,
		minRequestCount: 2,
		windowTime: 5,
		halfOpenTime: 10000
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

let c = 0;
broker.start().then(() => {
	setInterval(() => {
		broker.logger.info("Call", ++c);
		broker
			.call(
				"greeter.hello",
				{ name: "CodeSandbox" },
				{ fallbackResponse: () => broker.logger.info("Fallback Invoked!") }
			)
			.then(res => broker.logger.info(res, new Date()))
			.catch(err => broker.logger.error(err.message));
	}, 1000);
});
