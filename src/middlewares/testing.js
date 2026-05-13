/*
 * moleculer
 * Copyright (c) 2025 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");

/**
 * EventCatcher middleware
 *
 * Captures all emitted/broadcast events for test assertions.
 * Adds `broker.test` methods:
 *   - eventEmitted(eventName)
 *   - eventEmittedTimes(eventName)
 *   - eventEmittedWithParams(eventName, params)
 *   - waitForEvent(eventName, timeout)
 *   - clearEvents()
 */
module.exports.EventCatcher = function EventCatcherMiddleware(broker) {
	const capturedEvents = [];
	const eventWaiters = {};

	/* istanbul ignore next */
	function wrapEmit(next) {
		return function(event, payload, groups) {
			return next(event, payload, groups).then(res => {
				capturedEvents.push({ event, payload, type: "emit" });
				resolveWaiters(event, payload);
				return res;
			});
		};
	}

	/* istanbul ignore next */
	function wrapBroadcast(next) {
		return function(event, payload, groups) {
			return next(event, payload, groups).then(res => {
				capturedEvents.push({ event, payload, type: "broadcast" });
				resolveWaiters(event, payload);
				return res;
			});
		};
	}

	/* istanbul ignore next */
	function wrapBroadcastLocal(next) {
		return function(event, payload, groups) {
			return next(event, payload, groups).then(res => {
				capturedEvents.push({ event, payload, type: "broadcastLocal" });
				resolveWaiters(event, payload);
				return res;
			});
		};
	}

	function resolveWaiters(eventName, payload) {
		if (eventWaiters[eventName]) {
			eventWaiters[eventName].forEach(waiter => waiter.resolve(payload));
			delete eventWaiters[eventName];
		}
	}

	function eventEmitted(eventName) {
		return capturedEvents.some(e => e.event === eventName);
	}

	function eventEmittedTimes(eventName) {
		return capturedEvents.filter(e => e.event === eventName).length;
	}

	function eventEmittedWithParams(eventName, params) {
		return capturedEvents.some(
			e => e.event === eventName && _.isMatch(e.payload, params)
		);
	}

	function waitForEvent(eventName, timeout = 3000) {
		// Check if already emitted
		const existing = capturedEvents.filter(e => e.event === eventName);
		if (existing.length > 0) {
			return broker.Promise.resolve(existing[existing.length - 1].payload);
		}

		return new broker.Promise((resolve, reject) => {
			if (!eventWaiters[eventName]) {
				eventWaiters[eventName] = [];
			}
			eventWaiters[eventName].push({ resolve, reject });

			if (timeout > 0) {
				setTimeout(() => {
					reject(new Error(`Timeout waiting for event '${eventName}'`));
				}, timeout);
			}
		});
	}

	function clearEvents() {
		capturedEvents.length = 0;
		Object.keys(eventWaiters).forEach(key => delete eventWaiters[key]);
	}

	return {
		name: "EventCatcher",

		created() {
			if (!broker.test) broker.test = {};
			broker.test.eventEmitted = eventEmitted;
			broker.test.eventEmittedTimes = eventEmittedTimes;
			broker.test.eventEmittedWithParams = eventEmittedWithParams;
			broker.test.waitForEvent = waitForEvent;
			broker.test.clearEvents = clearEvents;
		},

		emit: wrapEmit,
		broadcast: wrapBroadcast,
		broadcastLocal: wrapBroadcastLocal
	};
};

// ----------------------------------------------------------------------

/**
 * MockBuilder for fluent mock definition
 */
class MockBuilder {
	constructor(actionName, mockStore) {
		this.actionName = actionName;
		this.mockStore = mockStore;
		this.params = undefined;
		this.meta = undefined;
		this.returnValue = undefined;
	}

	withParams(params) {
		this.params = params;
		return this;
	}

	withMeta(meta) {
		this.meta = meta;
		return this;
	}

	returns(value) {
		this.returnValue = value;
		this.mockStore.addMock(this);
		return this;
	}
}

/**
 * MockingCalls middleware
 *
 * Intercepts broker.call for test mocking and call tracking.
 * Adds `broker.test` methods:
 *   - mockAction(actionName) -> MockBuilder
 *   - actionCalled(actionName)
 *   - actionCalledTimes(actionName)
 *   - actionCalledWithParams(actionName, params)
 *   - actionCalledWithMeta(actionName, meta)
 *   - clearActions()
 */
module.exports.MockingCalls = function MockingCallsMiddleware(broker) {
	const mocks = [];
	const calledActions = [];

	class MockStore {
		addMock(mockBuilder) {
			mocks.push({
				actionName: mockBuilder.actionName,
				params: mockBuilder.params,
				meta: mockBuilder.meta,
				returnValue: mockBuilder.returnValue
			});
		}
	}

	const mockStore = new MockStore();

	function wrapCall(next) {
		return function(actionName, params, opts) {
			// Record the call
			calledActions.push({
				actionName,
				params,
				opts,
				time: Date.now()
			});

			// Find matching mock
			const mockDef = findMock(actionName, params, opts && opts.meta);
			if (mockDef) {
				if (mockDef.returnValue instanceof Error) {
					return broker.Promise.reject(mockDef.returnValue);
				}
				return broker.Promise.resolve(
					typeof mockDef.returnValue === "function"
						? mockDef.returnValue(ctx)
						: mockDef.returnValue
				);
			}

			// No mock found, call actual handler
			return next(actionName, params, opts);
		};
	}

	function findMock(actionName, params, meta) {
		// Find best matching mock: most specific match first
		return mocks.reduce((best, mock) => {
			if (mock.actionName !== actionName) return best;

			// Check params match
			if (mock.params && !_.isMatch(params, mock.params)) return best;

			// Check meta match
			if (mock.meta && !_.isMatch(meta, mock.meta)) return best;

			return mock; // Best match so far
		}, null);
	}

	function mockAction(actionName) {
		return new MockBuilder(actionName, mockStore);
	}

	function actionCalled(actionName) {
		return calledActions.some(c => c.actionName === actionName);
	}

	function actionCalledTimes(actionName) {
		return calledActions.filter(c => c.actionName === actionName).length;
	}

	function actionCalledWithParams(actionName, params) {
		return calledActions.some(
			c => c.actionName === actionName && _.isMatch(c.params, params)
		);
	}

	function actionCalledWithMeta(actionName, meta) {
		return calledActions.some(
			c => c.actionName === actionName && _.isMatch(c.opts && c.opts.meta, meta)
		);
	}

	function actionCalledWith(actionName, params, meta) {
		return calledActions.some(c => {
			if (c.actionName !== actionName) return false;
			if (params && !_.isMatch(c.params, params)) return false;
			if (meta && !_.isMatch(c.opts && c.opts.meta, meta)) return false;
			return true;
		});
	}

	function clearActions() {
		calledActions.length = 0;
	}

	function getCall(actionName) {
		return calledActions.filter(c => c.actionName === actionName);
	}

	return {
		name: "MockingCalls",

		created() {
			if (!broker.test) broker.test = {};
			broker.test.mockAction = mockAction;
			broker.test.actionCalled = actionCalled;
			broker.test.actionCalledTimes = actionCalledTimes;
			broker.test.actionCalledWithParams = actionCalledWithParams;
			broker.test.actionCalledWithMeta = actionCalledWithMeta;
			broker.test.actionCalledWith = actionCalledWith;
			broker.test.clearActions = clearActions;
			broker.test.getCall = getCall;
		},

		call: wrapCall
	};
};
