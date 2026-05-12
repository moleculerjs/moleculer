/*
 * moleculer
 * Copyright (c) 2026 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const { isFunction } = require("../utils");

function normalizeOptions(opts) {
	if (typeof opts === "number") return { timeout: opts };
	return opts || {};
}

module.exports = function EventCatcherMiddleware(broker) {
	const events = [];
	const waiters = [];

	function matches(expected, actual) {
		if (expected == null) return true;
		if (isFunction(expected)) return expected(actual);
		if (expected instanceof RegExp) return expected.test(actual.name);
		return expected === actual.name;
	}

	function resolveWaiters(event) {
		for (let i = waiters.length - 1; i >= 0; i--) {
			const waiter = waiters[i];
			if (matches(waiter.expected, event)) {
				clearTimeout(waiter.timer);
				waiters.splice(i, 1);
				waiter.resolve(event);
			}
		}
	}

	function record(name, payload, opts, type) {
		const event = {
			name,
			payload,
			opts,
			type,
			timestamp: Date.now()
		};

		events.push(event);
		resolveWaiters(event);
	}

	broker.events = {
		getEvents() {
			return events.slice();
		},

		clear() {
			events.length = 0;
		},

		find(expected) {
			return events.find(event => matches(expected, event));
		},

		waitFor(expected, opts) {
			opts = normalizeOptions(opts);
			const timeout = opts.timeout == null ? 1000 : opts.timeout;
			const existing = events.find(event => matches(expected, event));

			if (existing) return broker.Promise.resolve(existing);

			return new broker.Promise((resolve, reject) => {
				const waiter = { expected, resolve };
				waiter.timer = setTimeout(() => {
					const idx = waiters.indexOf(waiter);
					if (idx !== -1) waiters.splice(idx, 1);
					reject(new Error(`Event '${expected}' was not emitted within ${timeout}ms.`));
				}, timeout);
				waiters.push(waiter);
			});
		}
	};

	return {
		name: "EventCatcher",

		emit(next) {
			return (eventName, payload, opts) => {
				record(eventName, payload, opts, "emit");
				return next(eventName, payload, opts);
			};
		},

		broadcast(next) {
			return (eventName, payload, opts) => {
				record(eventName, payload, opts, "broadcast");
				return next(eventName, payload, opts);
			};
		},

		broadcastLocal(next) {
			return (eventName, payload, opts) => {
				record(eventName, payload, opts, "broadcastLocal");
				return next(eventName, payload, opts);
			};
		}
	};
};
