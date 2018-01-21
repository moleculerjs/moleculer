"use strict";

function myMiddleware() {
	return function (handler) {
		return function mw1(ctx) {
			ctx.broker.logger.warn("MW1 (from config)");
			return handler(ctx);
		};
	};
}

module.exports = {
	namespace: "config-test",
	logger: true,
	logLevel: "debug",

	middlewares: [myMiddleware()],

	created(broker) {
		broker.logger.warn("--- Broker created (from config)!");
	},

	started(broker) {
		broker.logger.warn("--- Broker started (from config)!");

		broker.createService({
			name: "test",
			actions: {
				hello(ctx) {
					return "Hello";
				}
			}
		});

		return broker.Promise.delay(2000)
			.then(() => broker.call("$node.list"));
	},

	stopped(broker) {
		return broker.Promise.delay(2000)
			.then(() => broker.logger.warn("--- Broker stopped"));
	}
};
