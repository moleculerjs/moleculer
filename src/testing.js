/*
 * moleculer
 * Copyright (c) 2025 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const ServiceBroker = require("./service-broker");

/**
 * Creates a ServiceBroker pre-configured for unit testing.
 * Logger is disabled by default. EventCatcher and MockingCalls middlewares are
 * installed automatically and exposed via broker.test.
 *
 * @param {Object} options - Broker options. Accepts an extra `services` array.
 * @returns {ServiceBroker}
 */
const createBroker = (options = {}) => {
	const { services = [], middlewares = [], ...rest } = options;

	const eventCatcher = new EventCatcher();
	const mockingCalls = new MockingCalls();

	const broker = new ServiceBroker({
		logger: false,
		...rest,
		middlewares: [eventCatcher.middleware(), mockingCalls.middleware(), ...middlewares],
	});

	broker.test = {
		eventEmitted: (name) => eventCatcher.emitted(name),
		eventEmittedTimes: (name) => eventCatcher.emittedTimes(name),
		eventEmittedWithParams: (name, params) => eventCatcher.emittedWithParams(name, params),
		clearEvents: () => eventCatcher.clear(),

		mockAction: (name, response) => mockingCalls.mock(name, response),
		actionCalled: (name) => mockingCalls.called(name),
		actionCalledTimes: (name) => mockingCalls.calledTimes(name),
		actionCalledWithParams: (name, params) => mockingCalls.calledWithParams(name, params),
		clearActions: () => mockingCalls.clear(),
	};

	for (const svc of services) broker.createService(svc);

	return broker;
};

/**
 * Middleware that captures events emitted via broker.emit / broadcast / broadcastLocal.
 * Used by createBroker to power the broker.test event assertion helpers.
 */
class EventCatcher {
	constructor() {
		this._events = [];
	}

	middleware() {
		const self = this;
		return {
			name: "EventCatcher",
			emit(next) {
				return (eventName, payload, opts) => {
					self._events.push({ name: eventName, params: payload });
					return next(eventName, payload, opts);
				};
			},
			broadcast(next) {
				return (eventName, payload, opts) => {
					self._events.push({ name: eventName, params: payload });
					return next(eventName, payload, opts);
				};
			},
			broadcastLocal(next) {
				return (eventName, payload, opts) => {
					self._events.push({ name: eventName, params: payload });
					return next(eventName, payload, opts);
				};
			},
		};
	}

	/** Returns true if the named event was emitted at least once. */
	emitted(name) {
		return this._events.some((e) => e.name === name);
	}

	/** Returns how many times the named event was emitted. */
	emittedTimes(name) {
		return this._events.filter((e) => e.name === name).length;
	}

	/**
	 * Returns true if the named event was emitted with params that include
	 * all key/value pairs in `expected` (deep partial match).
	 */
	emittedWithParams(name, expected) {
		return this._events
			.filter((e) => e.name === name)
			.some((e) => deepPartialMatch(e.params, expected));
	}

	/** Clears all captured events. */
	clear() {
		this._events = [];
	}
}

/**
 * Middleware that intercepts broker.call() to enable response mocking and call assertions.
 * Used by createBroker to power the broker.test action helpers.
 */
class MockingCalls {
	constructor() {
		this._mocks = new Map();
		this._calls = [];
	}

	middleware() {
		const self = this;
		return {
			name: "MockingCalls",
			call(next) {
				return (actionName, params, opts) => {
					self._calls.push({ name: actionName, params });
					if (self._mocks.has(actionName)) {
						const response = self._mocks.get(actionName);
						return Promise.resolve(
							typeof response === "function" ? response(params) : response
						);
					}
					return next(actionName, params, opts);
				};
			},
		};
	}

	/** Register a static or factory mock response for an action. */
	mock(name, response) {
		this._mocks.set(name, response);
	}

	/** Returns true if the named action was called at least once. */
	called(name) {
		return this._calls.some((c) => c.name === name);
	}

	/** Returns how many times the named action was called. */
	calledTimes(name) {
		return this._calls.filter((c) => c.name === name).length;
	}

	/**
	 * Returns true if the named action was called with params that include
	 * all key/value pairs in `expected` (deep partial match).
	 */
	calledWithParams(name, expected) {
		return this._calls
			.filter((c) => c.name === name)
			.some((c) => deepPartialMatch(c.params, expected));
	}

	/** Clears all mocks and call history. */
	clear() {
		this._calls = [];
		this._mocks.clear();
	}
}

/**
 * Deep partial match: returns true if all keys in `expected` exist in `actual`
 * with equal values. Extra keys in `actual` are ignored.
 */
const deepPartialMatch = (actual, expected) => {
	if (actual === expected) return true;
	if (expected === null || typeof expected !== "object") return actual === expected;
	if (actual === null || typeof actual !== "object") return false;
	return Object.keys(expected).every((key) => deepPartialMatch(actual[key], expected[key]));
};

module.exports = { createBroker, EventCatcher, MockingCalls };
