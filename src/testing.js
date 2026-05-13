/*
 * moleculer
 * Copyright (c) 2025 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const ServiceBroker = require("./service-broker");
const Middlewares = require("./middlewares");

/**
 * Create a ServiceBroker configured for testing.
 *
 * - Disables logging
 * - Sets `test: true` flag on the broker
 * - Registers EventCatcher and MockingCalls middlewares automatically
 * - Accepts optional mock service definitions
 *
 * @param {Object} [opts={}] - Additional broker options
 * @param {Array<Object>} [mockServices=[]] - Array of mock service schemas to register
 * @returns {ServiceBroker}
 *
 * @example
 * const { createBroker } = require("moleculer").Testing;
 *
 * const broker = createBroker({ nodeID: "test" }, [
 *   {
 *     name: "greeter",
 *     actions: {
 *       hello(ctx) {
 *         return `Hello ${ctx.params.name}`;
 *       }
 *     }
 *   }
 * ]);
 *
 * await broker.start();
 * const res = await broker.call("greeter.hello", { name: "World" });
 * console.log(res); // "Hello World"
 * await broker.stop();
 */
function createBroker(opts = {}, mockServices = []) {
	const broker = new ServiceBroker(
		Object.assign(
			{
				logger: false,
				test: true
			},
			opts,
			{
				middlewares: [
					...(opts.middlewares || []),
					Middlewares.Testing.EventCatcher,
					Middlewares.Testing.MockingCalls
				]
			}
		)
	);

	mockServices.forEach(svc => {
		broker.createService(svc);
	});

	return broker;
}

module.exports = {
	createBroker,
	EventCatcher: Middlewares.Testing.EventCatcher,
	MockingCalls: Middlewares.Testing.MockingCalls
};
