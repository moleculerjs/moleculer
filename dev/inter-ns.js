"use strict";

const { ServiceBroker } = require("../");
const _ = require("lodash");
const Promise = require("bluebird");

// --- INTER-NAMESPACE MIDDLEWARE ---
const InterNamespaceMiddleware = function(opts) {
	if (!Array.isArray(opts))
		throw new Error("Must be an Array");

	let thisBroker;
	const brokers = {};

	return {
		created(broker) {
			thisBroker = broker;
			opts.forEach(nsOpts => {
				if (_.isString(nsOpts)) {
					nsOpts = {
						namespace: nsOpts
					};
				}
				const ns = nsOpts.namespace;

				this.logger.info(`Create internamespace broker for '${ns} namespace...'`);
				const brokerOpts = _.defaultsDeep({}, nsOpts, { nodeID: null, middlewares: null }, broker.options);
				brokers[ns] = new ServiceBroker(brokerOpts);
			});
		},

		started() {
			return Promise.all(Object.values(brokers).map(b => b.start()));
		},

		stopped() {
			return Promise.all(Object.values(brokers).map(b => b.stop()));
		},

		call(next) {
			return function(actionName, params, opts = {}) {
				if (_.isString(actionName) && actionName.includes("@")) {
					const [action, namespace] = actionName.split("@");

					if (brokers[namespace]) {
						return brokers[namespace].call(action, params, opts);
					} else if (namespace === thisBroker.namespace) {
						return next(action, params, opts);
					} else {
						throw new Error("Unknow namespace: " + namespace);
					}
				}

				return next(actionName, params, opts);
			};
		},
	};
};


// --- NAMESPACE: ns-mars ---
const broker1 = new ServiceBroker({
	namespace: "ns-mars",
	nodeID: "node-1",
	transporter: "NATS",
});

broker1.createService({
	name: "greeter",
	actions: {
		hello(ctx) {
			return `Hello from '${this.broker.namespace}' namespace!`;
		}
	}
});

// --- NAMESPACE: ns-venus ---
const broker2 = new ServiceBroker({
	namespace: "ns-venus",
	nodeID: "node-1",
	transporter: "NATS",
});

broker2.createService({
	name: "greeter",
	actions: {
		hello(ctx) {
			return `Hello from '${this.broker.namespace}' namespace!`;
		}
	}
});

// --- LOCAL NAMESPACE ---
const broker = new ServiceBroker({
	namespace: "local",
	nodeID: "node-1",
	transporter: "NATS",
	middlewares: [
		InterNamespaceMiddleware(["ns-mars", "ns-venus"])
	]
});

broker.createService({
	name: "greeter",
	actions: {
		hello(ctx) {
			return `Hello from '${this.broker.namespace}' namespace!`;
		}
	}
});


Promise.all([broker1.start(), broker2.start(), broker.start()])
	.delay(2000)
	.then(() => {
		broker.repl();

	})
	.then(() => broker.call("greeter.hello").then(res => broker.logger.info("Call 'greeter.hello':", res)))
	.then(() => broker.call("greeter.hello@local").then(res => broker.logger.info("Call 'greeter.hello@local':", res)))
	.then(() => broker.call("greeter.hello@ns-venus").then(res => broker.logger.info("Call 'greeter.hello@ns-venus':", res)))
	.then(() => broker.call("greeter.hello@ns-mars").then(res => broker.logger.info("Call 'greeter.hello@ns-mars':", res)))
	.catch(err => broker.logger.error(err));


