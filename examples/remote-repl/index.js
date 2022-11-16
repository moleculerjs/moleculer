"use strict";

let ServiceBroker = require("../../src/service-broker");

const broker = new ServiceBroker({
	replTcpPort: 1337
});

broker.createService({
	name: "greeter",
	actions: {
		welcome: {
			handler(ctx) {
				return `Hello ${ctx.params.name}`;
			}
		}
	},
	events: {
		"$tracing.spans"(ctx) {
			this.logger.info("Span event received", ctx.params);
		}
	}
});

broker
	.start()
	.then(() => broker.repl())
	.then(() => broker.call("greeter.welcome", { name: "Icebob" }))
	.then(res => broker.logger.info("Result:", res))
	.catch(err => broker.logger.error(err));
