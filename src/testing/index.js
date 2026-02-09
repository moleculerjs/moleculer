"use strict";

const EventCatcher = require("./event-catcher");
const MockingCalls = require("./mocking-calls");

/**
 * Create a ServiceBroker configured for testing.
 *
 * @param {Object} [options] - Broker options (merged with test defaults)
 * @param {Array}  [mockServices] - Array of service schemas to register as mock services
 * @returns {ServiceBroker}
 */
function createBroker(options, mockServices) {
	const ServiceBroker = require("../service-broker");

	const testDefaults = {
		logger: false,
		test: true,
		middlewares: [EventCatcher(), MockingCalls()]
	};

	// Merge user middlewares with test middlewares
	const userMiddlewares = (options && options.middlewares) || [];
	const mergedOptions = Object.assign({}, testDefaults, options, {
		middlewares: [...testDefaults.middlewares, ...userMiddlewares]
	});

	const broker = new ServiceBroker(mergedOptions);

	// Register mock services
	if (Array.isArray(mockServices)) {
		for (const schema of mockServices) {
			broker.createService(schema);
		}
	}

	return broker;
}

module.exports = {
	createBroker,
	EventCatcher,
	MockingCalls
};
