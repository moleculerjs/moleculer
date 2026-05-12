/*
 * moleculer
 * Copyright (c) 2026 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");

const ServiceBroker = require("../service-broker");
const EventCatcher = require("./event-catcher");
const MockingCalls = require("./mocking-calls");

function toServiceSchemas(mockServices) {
	if (!mockServices) return [];
	if (Array.isArray(mockServices)) return mockServices;

	return Object.keys(mockServices).map(name => {
		const service = mockServices[name];
		return {
			name,
			...service
		};
	});
}

function createBroker(opts = {}) {
	const { mockServices, middlewares, ...brokerOptions } = opts;
	const broker = new ServiceBroker(
		_.defaultsDeep({}, brokerOptions, {
			logger: false,
			test: true,
			middlewares: [EventCatcher, MockingCalls].concat(middlewares || [])
		})
	);

	toServiceSchemas(mockServices).forEach(schema => broker.createService(schema));

	return broker;
}

module.exports = {
	createBroker,
	EventCatcher,
	MockingCalls
};
