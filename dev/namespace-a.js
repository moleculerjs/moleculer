"use strict";

const ServiceBroker = require("../src/service-broker");

const broker = new ServiceBroker({
	namespace: "projectA",
	nodeID: "node-1",
	transporter: "NATS",
	logFormatter: "short"
});

// Example greeter service in namespace "projectA"
broker.createService({
	name: "greeter",
	actions: {
		hello(ctx) {
			return "Hello from Project A!";
		}
	}
});

/** Inter-namespace connector service */
broker.createService({
	name: "ns-connector",
	settings: {
		namespaces: [
			"projectB",
			"projectC",
			"projectD"
		],
		brokerOptions: {
			nodeID: "ns-connector",
			transporter: "NATS",
			logFormatter: "short"
		}
	},
	actions: {
		call: {
			params: {
				ns: "string",
				action: "string",
				params: { type: "any", optional: true }
			},
			handler(ctx) {
				const b = this.brokers[ctx.params.ns];
				if (!b)
					return Promise.reject(new Error("Not defined namespace!"));

				return b.call(ctx.params.action, ctx.params.params, { meta: ctx.meta });
			}
		}
	},
	created() {
		this.brokers = {};
		this.settings.namespaces.forEach(namespace => {
			this.logger.info(`Create broker for '${namespace} namespace...'`);
			this.brokers[namespace] = new ServiceBroker(
				Object.assign({}, this.settings.brokerOptions, { namespace }));
		});
	},

	started() {
		return Promise.all(Object.values(this.brokers).map(b => b.start()));
	},

	stopped() {
		return Promise.all(Object.values(this.brokers).map(b => b.stop()));
	}
});

broker.start().then(() => {
	broker.repl();
});
