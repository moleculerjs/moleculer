"use strict";

const ServiceBroker = require("../src/service-broker");
const E = require("../src/errors");

const broker = new ServiceBroker({
	requestTimeout: 5 * 1000
});

broker.createService({
	name: "test",
	actions: {
		slow: {
			timeout: 2000,
			async handler(ctx) {
				await this.Promise.delay(3000);
				return "OK";
			}
		}
	}
});

broker
	.start()
	.then(() => broker.repl())
	.then(() => broker.Promise.delay(1000))
	.then(() => broker.logger.info("Calling action..."))
	.then(() => broker.call("test.slow", null, { timeout: 4000 }))
	.then(res => broker.logger.info(res))
	.catch(err => broker.logger.error(err.message));
