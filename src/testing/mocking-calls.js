/*
 * moleculer
 * Copyright (c) 2026 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const { isFunction } = require("../utils");

module.exports = function MockingCallsMiddleware(broker) {
	const mocks = new Map();
	const calls = [];

	function normalizeMock(handler) {
		if (isFunction(handler)) return handler;
		return () => handler;
	}

	broker.mockAction = function mockAction(actionName, handler) {
		mocks.set(actionName, normalizeMock(handler));
		return broker;
	};

	broker.clearActionMocks = function clearActionMocks() {
		mocks.clear();
		calls.length = 0;
		return broker;
	};

	broker.getMockedActionCalls = function getMockedActionCalls(actionName) {
		const selected = actionName ? calls.filter(call => call.actionName === actionName) : calls;
		return selected.slice();
	};

	return {
		name: "MockingCalls",

		call(next) {
			return (actionName, params, opts = {}) => {
				if (!mocks.has(actionName)) return next(actionName, params, opts);

				const call = { actionName, params, opts };
				calls.push(call);

				return broker.Promise.resolve()
					.then(() => mocks.get(actionName).call(broker, params, opts, call))
					.then(result => {
						call.result = result;
						return result;
					});
			};
		}
	};
};
