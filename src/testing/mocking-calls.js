"use strict";

/**
 * MockingCalls middleware for Moleculer testing.
 * Intercepts broker.call, records all calls, and can return mocked responses.
 */
module.exports = function MockingCallsMiddleware() {
	const capturedCalls = [];
	const mocks = [];

	function findMock(actionName, params, meta) {
		for (const mock of mocks) {
			if (mock.actionName !== actionName) continue;

			if (mock.params !== undefined) {
				try {
					if (JSON.stringify(params) !== JSON.stringify(mock.params)) continue;
				} catch (_err) {
					if (params !== mock.params) continue;
				}
			}

			if (mock.meta !== undefined) {
				try {
					if (JSON.stringify(meta) !== JSON.stringify(mock.meta)) continue;
				} catch (_err) {
					if (meta !== mock.meta) continue;
				}
			}

			return mock;
		}
		return null;
	}

	return {
		name: "MockingCalls",

		created(broker) {
			if (!broker.test) broker.test = {};

			broker.test.mockAction = function (actionName) {
				const mock = {
					actionName,
					params: undefined,
					meta: undefined,
					returnVal: undefined,
					errorVal: undefined,

					withParams(params) {
						mock.params = params;
						return mock;
					},

					withMeta(meta) {
						mock.meta = meta;
						return mock;
					},

					returnValue(value) {
						mock.returnVal = value;
						mock.errorVal = undefined;
						mocks.push(mock);
						return mock;
					},

					rejectWith(error) {
						mock.errorVal = error;
						mock.returnVal = undefined;
						mocks.push(mock);
						return mock;
					}
				};

				return mock;
			};

			broker.test.actionCalled = function (actionName) {
				return capturedCalls.some(c => c.actionName === actionName);
			};

			broker.test.actionCalledTimes = function (actionName) {
				return capturedCalls.filter(c => c.actionName === actionName).length;
			};

			broker.test.actionCalledWithParams = function (actionName, params) {
				return capturedCalls.some(c => {
					if (c.actionName !== actionName) return false;
					try {
						return JSON.stringify(c.params) === JSON.stringify(params);
					} catch (_err) {
						return c.params === params;
					}
				});
			};

			broker.test.getCalls = function (actionName) {
				if (actionName) {
					return capturedCalls.filter(c => c.actionName === actionName);
				}
				return [...capturedCalls];
			};

			broker.test.clearActions = function () {
				capturedCalls.length = 0;
			};

			broker.test.clearMocks = function () {
				mocks.length = 0;
			};

			broker.test.clearAll = function () {
				capturedCalls.length = 0;
				mocks.length = 0;
				if (broker.test.clearEvents) {
					broker.test.clearEvents();
				}
			};
		},

		call(next) {
			return function (actionName, params, opts) {
				capturedCalls.push({
					actionName,
					params,
					opts,
					timestamp: Date.now()
				});

				const meta = opts && opts.meta;
				const mock = findMock(actionName, params, meta);
				if (mock) {
					if (mock.errorVal !== undefined) {
						return Promise.reject(
							mock.errorVal instanceof Error
								? mock.errorVal
								: new Error(String(mock.errorVal))
						);
					}
					return Promise.resolve(mock.returnVal);
				}

				return next(actionName, params, opts);
			};
		}
	};
};
