"use strict";

const ServiceBroker = require("../src/service-broker");

// Create broker #1
const broker = new ServiceBroker({
	logLevel: "debug",
	__errorHandler(err, info) {
		broker.logger.error("Errorhandler:", err.message);
		throw err;
	}
});

broker.createService({
	name: "test",
	events: {
		"very.danger"(ctx) {
			throw new Error("Danger event!");
		}
	}
});

broker.start()
	.then(() => {
		broker.repl();

		return broker.emit("very.danger");
	})
	.catch(err => broker.logger.error("Demo error", err));
