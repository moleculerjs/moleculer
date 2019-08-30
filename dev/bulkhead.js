"use strict";

const _ = require("lodash");
const ServiceBroker = require("../src/service-broker");
const E = require("../src/errors");

const broker = new ServiceBroker({
	logFormatter: "short",
	bulkhead: {
		enabled: false,
		concurrency: 3,
		maxQueueSize: 100,
	},
	metrics: {
		enabled: true,
		reporter: {
			type: "Console",
			options: {
				onlyChanges: true,
				includes: "moleculer.**.bulkhead.**",

			}
		}
	}
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
	},

	events: {
		"user.created": {
			bulkhead: {
				enabled: true,
				concurrency: 1
			},
			async handler(ctx) {
				this.logger.info("Event received.", ctx.params);
				await this.Promise.delay(_.random(500, 2500));
				this.logger.info("User created.", ctx.params);
			}
		},

		"post.created": {
			async handler(ctx) {
				this.logger.info("Event received.", ctx.params);
				await this.Promise.delay(_.random(500, 2500));
				this.logger.info("Post created.", ctx.params);
			}
		}
	}
});

let id = 1;
broker.start()
	.then(() => broker.repl())
	.then(() => {
		return broker.Promise.all(_.times(10, id => {
			return broker.call("test.second", { id });
			//return broker.emit("user.created", { id });
		}));
	})
	/*.then(() => {
		setInterval(() => broker.call("test.second", { id: id++ }), 200);
	})*/
	.then(res => broker.logger.info("Done!"))
	.catch(err => broker.logger.error(err.message));
