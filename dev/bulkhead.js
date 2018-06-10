"use strict";

const _ = require("lodash");
const ServiceBroker = require("../src/service-broker");
const E = require("../src/errors");
const BulkHeadMiddleware = require("../src/middlewares/bulkhead");

const broker = new ServiceBroker({
	logFormatter: "short",
	bulkhead: {
		enabled: false,
		concurrency: 3,
		maxQueueSize: 100,
	},
	middlewares: [
		BulkHeadMiddleware()
	]
});

broker.createService({
	name: "test",
	actions: {
		first: {
			bulkhead: {
				enabled: true,
				concurrency: 1
			},
			async handler(ctx) {

				await this.Promise.delay(_.random(500, 2500));

				this.logger.info("First called.", ctx.params);

				return ctx.params;
			}
		},

		second: {
			bulkhead: {
				enabled: true,
				concurrency: 1
			},
			async handler(ctx) {

				await this.Promise.delay(_.random(500, 2500));

				this.logger.info("Second called.", ctx.params);

				return ctx.params;
			}
		},
	}
});

let id = 1;
broker.start()
	.then(() => broker.repl())
	.then(() => {
		return broker.Promise.all(_.times(10, id => {
			return broker.call("test.second", { id });
		}));
	})
	/*.then(() => {
		setInterval(() => broker.call("test.second", { id: id++ }), 200);
	})*/
	.then(res => broker.logger.info("Done!"))
	.catch(err => broker.logger.error(err.message));
