"use strict";

const ServiceBroker = require("../src/service-broker");
const E = require("../src/errors");

const broker = new ServiceBroker({
	logFormatter: "short",
	retryPolicy: {
		enabled: true,
		delay: 100,
		maxDelay: 2000,
		factor: 2,
		retries: 5,
		//check: err => !!err
	},
	requestTimeout: 30 * 1000,
});

broker.createService({
	name: "test",
	actions: {
		wrong: {
			retryPolicy: {
				enabled: true,
				//retries: 3,
				delay: 50
			},
			params: {
				a: "number"
			},
			handler(ctx) {
				this.logger.info("Action called.", ctx.options.retries);
				//if (ctx.retries < 5)
				//throw new E.MoleculerError("Some error");
				throw new E.MoleculerRetryableError("Some error");
			}
		},
	}
});


broker.start()
	.then(() => broker.repl())
	.then(() => broker.Promise.delay(1000))
	.then(() => broker.call("test.wrong", { a: true }, { requestID: "123", retries: null }))
	.then(res => broker.logger.info(res))
	.catch(err => broker.logger.error(err.message));
