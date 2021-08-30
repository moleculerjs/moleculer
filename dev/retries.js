"use strict";

const _ = require("lodash");
const ServiceBroker = require("../src/service-broker");
const E = require("../src/errors");

const broker = new ServiceBroker({
	retryPolicy: {
		enabled: true,
		delay: 100,
		maxDelay: 2000,
		factor: 2,
		retries: 5
		//check: err => !!err
	},
	tracing: {
		enabled: true,
		exporter: ["Console", "Event"]
	},
	requestTimeout: 30 * 1000
});

const apiService = broker.createService({
	name: "api",
	actions: {
		rest: {
			//visibility: "private",
			handler(ctx) {
				return ctx.call("test.wrong", ctx.params);
			}
		}
	},

	events: {
		"$tracing.spans"(ctx) {
			console.log(
				"Spans",
				ctx.params.map(span => {
					return {
						id: span.id,
						name: span.name,
						duration: span.duration,
						retryAttempts: span.tags.retryAttempts,
						error: span.error ? span.error.name : undefined
					};
				})
			);
		}
	}
});

broker.createService({
	name: "test",
	actions: {
		wrong: {
			params: {
				a: "number"
			},
			async handler(ctx) {
				this.logger.info("Action called.", ctx._retryAttempts);
				if (!ctx._retryAttempts || ctx._retryAttempts < 2) {
					await this.Promise.delay(50);
					throw new E.MoleculerRetryableError("Some error");
				}
				//throw new E.MoleculerRetryableError("Some error");

				return "OK";
			}
		}
	}
});

broker
	.start()
	.then(() => broker.repl())
	.then(() => broker.Promise.delay(1000))
	.then(() => broker.call("api.rest", { a: 5 }, { requestID: "123", retries: null }))
	//.then(() => apiService.actions.rest({ a: 5 }, { requestID: "123", retries: null }))
	.then(res => broker.logger.info(res))
	.catch(err => broker.logger.error(err.message));
