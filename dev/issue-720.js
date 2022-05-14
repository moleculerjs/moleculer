"use strict";

const ServiceBroker = require("../src/service-broker");

const broker = new ServiceBroker({
	logLevel: "debug",
	tracing: {
		enabled: true,
		// exporter: "Console"
		exporter: [
			{
				type: "Console",
				options: {
					excludes: ["math.**"]
				}
			}
		]
	}
});

broker.createService({
	name: "boolean",

	actions: {
		random: {
			handler() {
				return Boolean(Math.round(Math.random()));
			}
		}
	}
});

broker.createService({
	name: "math",

	actions: {
		random: {
			async handler(ctx) {
				const res = await ctx.call("boolean.random");
				return `Math.random() - ${res}`;
			}
		}
	}
});

broker.createService({
	name: "greeter",
	actions: {
		hello: {
			async handler(ctx) {
				const res = await ctx.call("math.random");
				return `Hello! - ${res}`;
			}
		}
	}
});

broker.start().then(async () => {
	// broker.repl();

	await broker.call("greeter.hello");

	await broker.call("math.random");
});
