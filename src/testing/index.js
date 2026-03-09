/*
 * moleculer
 * Copyright (c) 2024 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const EventCatcher = require("./event-catcher");
const MockingCalls = require("./mocking-calls");

/**
 * Create a {@link ServiceBroker} pre-configured for unit testing.
 *
 * The broker is created with:
 * - `logger: false` — silences all output during tests
 * - `test: true` — marks the broker as a test instance
 * - `EventCatcher` middleware — records every emitted event
 * - `MockingCalls` middleware — intercepts and optionally mocks action calls
 *
 * Any options passed as the first argument are merged on top of those defaults.
 * Additional middlewares supplied in `options.middlewares` are appended after
 * the test middlewares, so they receive the already-recorded call.
 *
 * @example
 * const { createBroker } = require("moleculer").Testing;
 * const broker = createBroker();
 * await broker.start();
 * // … run tests …
 * await broker.stop();
 *
 * @param {Object}  [options={}]      - ServiceBroker options (merged with test defaults)
 * @param {Array}   [mockServices=[]] - Service schemas to register before start
 * @returns {import("../service-broker")}
 */
function createBroker(options = {}, mockServices = []) {
	const ServiceBroker = require("../service-broker");

	const userMiddlewares = Array.isArray(options.middlewares) ? options.middlewares : [];

	const broker = new ServiceBroker(
		Object.assign({}, options, {
			logger: false,
			test: true,
			middlewares: [EventCatcher(), MockingCalls(), ...userMiddlewares]
		})
	);

	for (const schema of mockServices) {
		broker.createService(schema);
	}

	return broker;
}

module.exports = {
	createBroker,
	EventCatcher,
	MockingCalls
};
