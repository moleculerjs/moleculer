const ServiceBroker = require("../src/service-broker");

const broker = new ServiceBroker({
	metrics: {
		enabled: true
	},

	tracing: {
		enabled: true,
		sampling: {
			rate: 1.0
		},
		events: true,
		exporter: {
			type: "Event"
		}
	}
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
