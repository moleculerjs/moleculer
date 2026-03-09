/*
 * moleculer
 * Copyright (c) 2024 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

/**
 * MockingCalls middleware for Moleculer testing.
 *
 * Intercepts `broker.call`, records every invocation, and can return mock
 * responses for registered action names. Attaches a `broker.test` namespace
 * with assertion and mock-registration helpers.
 *
 * Usage (standalone):
 *   broker = new ServiceBroker({ middlewares: [MockingCalls()] });
 *
 * Usage (via createBroker):
 *   broker = createBroker(); // MockingCalls included automatically
 *
 * @returns {Object} Moleculer middleware object
 */
function MockingCalls() {
	/** @type {Array<{actionName: string, params: *, opts: *}>} */
	const capturedCalls = [];

	/**
	 * Registered mocks. Each entry is a mock descriptor produced by mockAction().
	 * @type {Array<MockDescriptor>}
	 */
	const mocks = [];

	/**
	 * Find the first mock that matches the given call.
	 * A mock matches when:
	 *   - actionName matches exactly
	 *   - if mock.params is defined, params deep-equals mock.params
	 *   - if mock.meta is defined, meta deep-equals mock.meta
	 *
	 * @param {string} actionName
	 * @param {*} params
	 * @param {*} meta
	 * @returns {MockDescriptor|null}
	 */
	function findMock(actionName, params, meta) {
		for (const mock of mocks) {
			if (mock.actionName !== actionName) continue;
			if (mock.matchParams !== undefined) {
				if (JSON.stringify(params) !== JSON.stringify(mock.matchParams)) continue;
			}
			if (mock.matchMeta !== undefined) {
				if (JSON.stringify(meta) !== JSON.stringify(mock.matchMeta)) continue;
			}
			return mock;
		}
		return null;
	}

	return {
		name: "MockingCalls",

		/**
		 * Called by Moleculer after the broker is created.
		 * Attaches assertion helpers and the mock registration API to `broker.test`.
		 * @param {import("../service-broker")} broker
		 */
		created(broker) {
			if (!broker.test) broker.test = {};

			/**
			 * Register a mock for an action call.
			 *
			 * Returns a fluent builder:
			 *   .withParams(params)  — only match calls with these params
			 *   .withMeta(meta)      — only match calls with this meta
			 *   .returnValue(value)  — resolve with value (registers the mock)
			 *   .rejectWith(error)   — reject with error (registers the mock)
			 *
			 * The mock is only added to the active mock list when `.returnValue()`
			 * or `.rejectWith()` is called. This avoids half-configured mocks
			 * silently intercepting calls.
			 *
			 * @param {string} actionName
			 * @returns {MockBuilder}
			 */
			broker.test.mockAction = function mockAction(actionName) {
				/** @type {MockDescriptor} */
				const descriptor = {
					actionName,
					matchParams: undefined,
					matchMeta: undefined,
					resolveValue: undefined,
					rejectError: undefined,
					_registered: false
				};

				const builder = {
					/**
					 * Constrain this mock to calls that pass params deep-equal to `params`.
					 * @param {*} params
					 * @returns {MockBuilder}
					 */
					withParams(params) {
						descriptor.matchParams = params;
						return builder;
					},

					/**
					 * Constrain this mock to calls that pass meta deep-equal to `meta`.
					 * @param {*} meta
					 * @returns {MockBuilder}
					 */
					withMeta(meta) {
						descriptor.matchMeta = meta;
						return builder;
					},

					/**
					 * Make this mock resolve with `value`.
					 * Registers the mock — subsequent matching calls return this value.
					 * @param {*} value
					 * @returns {MockBuilder}
					 */
					returnValue(value) {
						descriptor.resolveValue = value;
						descriptor.rejectError = undefined;
						if (!descriptor._registered) {
							mocks.push(descriptor);
							descriptor._registered = true;
						}
						return builder;
					},

					/**
					 * Make this mock reject with `error`.
					 * If `error` is a string, it is wrapped in `new Error(error)`.
					 * Registers the mock — subsequent matching calls throw this error.
					 * @param {Error|string} error
					 * @returns {MockBuilder}
					 */
					rejectWith(error) {
						descriptor.rejectError =
							error instanceof Error ? error : new Error(String(error));
						descriptor.resolveValue = undefined;
						if (!descriptor._registered) {
							mocks.push(descriptor);
							descriptor._registered = true;
						}
						return builder;
					}
				};

				return builder;
			};

			/**
			 * Check whether an action was called at least once.
			 * @param {string} actionName
			 * @returns {boolean}
			 */
			broker.test.actionCalled = function actionCalled(actionName) {
				return capturedCalls.some(c => c.actionName === actionName);
			};

			/**
			 * Return the number of times an action was called.
			 * @param {string} actionName
			 * @returns {number}
			 */
			broker.test.actionCalledTimes = function actionCalledTimes(actionName) {
				return capturedCalls.filter(c => c.actionName === actionName).length;
			};

			/**
			 * Check whether an action was called with a specific params object.
			 * Uses deep equality (JSON serialization).
			 * @param {string} actionName
			 * @param {*} params
			 * @returns {boolean}
			 */
			broker.test.actionCalledWithParams = function actionCalledWithParams(
				actionName,
				params
			) {
				const expected = JSON.stringify(params);
				return capturedCalls.some(
					c => c.actionName === actionName && JSON.stringify(c.params) === expected
				);
			};

			/**
			 * Return captured call records, optionally filtered by action name.
			 * @param {string} [actionName]
			 * @returns {Array}
			 */
			broker.test.getCalls = function getCalls(actionName) {
				if (actionName) return capturedCalls.filter(c => c.actionName === actionName);
				return capturedCalls.slice();
			};

			/**
			 * Clear all recorded call history. Registered mocks remain active.
			 */
			broker.test.clearActions = function clearActions() {
				capturedCalls.length = 0;
			};

			/**
			 * Remove all registered mocks. Call history remains.
			 */
			broker.test.clearMocks = function clearMocks() {
				mocks.length = 0;
			};

			/**
			 * Clear call history, mocks, and events (if EventCatcher is active).
			 */
			broker.test.clearAll = function clearAll() {
				capturedCalls.length = 0;
				mocks.length = 0;
				if (typeof broker.test.clearEvents === "function") {
					broker.test.clearEvents();
				}
			};
		},

		/** @param {Function} next */
		call(next) {
			return function (actionName, params, opts) {
				capturedCalls.push({ actionName, params, opts });

				const meta = opts && opts.meta;
				const mock = findMock(actionName, params, meta);
				if (mock) {
					if (mock.rejectError !== undefined) {
						return Promise.reject(mock.rejectError);
					}
					return Promise.resolve(mock.resolveValue);
				}

				return next(actionName, params, opts);
			};
		}
	};
}

module.exports = MockingCalls;
