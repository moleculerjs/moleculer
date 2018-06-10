"use strict";

const ServiceBroker = require("../src/service-broker");
const E = require("../src/errors");
const RetryMiddleware = require("../src/middlewares/retry");

const broker = new ServiceBroker({
	logFormatter: "short",
	retryPolicy: {
		enabled: true,
		delay: 100,
		maxDelay: 2000,
		factor: 2,
		retries: 5,
		//check: err => err.code >= 500
	},
	middlewares: [
		RetryMiddleware(broker.options.retryPolicy)
	]
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
			handler(ctx) {
				this.logger.info("Action called.", ctx.retries);
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
	.then(() => broker.call("test.wrong", null, { requestID: "123", retries: 3, _fallbackResponse: "Fallback" }))
	.then(res => broker.logger.info(res))
	.catch(err => broker.logger.error(err.message));
