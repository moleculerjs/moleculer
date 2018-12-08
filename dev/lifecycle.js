const ServiceBroker = require("../src/service-broker");

const broker = new ServiceBroker({
	nodeID: "node-" + process.pid,
	transporter: "NATS",
});

broker.createService({
	name: "greeter",
	actions: {
		hello: {
			rest: "hello",
			handler(ctx) {
				return "Hello World";
			}
		},
	},
});

broker.createService({
	name: "$listener",
	events: {
		"$broker.started"(payload, sender, event) { this.logger.info(event); },
		"$broker.stopped"(payload, sender, event) { this.logger.info(event); },

		"$transporter.connected"(payload, sender, event) { this.logger.info(event); },
		"$transporter.disconnected"(payload, sender, event) { this.logger.info(event); },

		"$node.connected"({ node }, sender, event) { this.logger.info(event, node.id); },
		"$node.updated"({ node }, sender, event) { this.logger.info(event, node.id); },
		"$node.disconnected"({ node }, sender, event) { this.logger.info(event, node.id); },

		"$services.changed"(payload, sender, event) { this.logger.info(event); },

		"$circuit-breaker.opened"(payload, sender, event) { this.logger.info(event); },
		"$circuit-breaker.half-opened"(payload, sender, event) { this.logger.info(event); },
		"$circuit-breaker.closed"(payload, sender, event) { this.logger.info(event); },
	},
});

broker.start().then(() => {
	broker.repl();

	setTimeout(() => broker.loadService("./examples/hot.service.js"), 5000);
});
