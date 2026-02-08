"use strict";

/**
 * EventCatcher middleware for Moleculer testing.
 * Intercepts emit, broadcast, and broadcastLocal calls and records them
 * for later assertion.
 */
module.exports = function EventCatcherMiddleware() {
	const capturedEvents = [];

	function recordEvent(type, eventName, payload, opts) {
		capturedEvents.push({
			type,
			eventName,
			payload,
			opts,
			timestamp: Date.now()
		});
	}

	return {
		name: "EventCatcher",

		created(broker) {
			if (!broker.test) broker.test = {};

			broker.test.eventEmitted = function (eventName) {
				return capturedEvents.some(e => e.eventName === eventName);
			};

			broker.test.eventEmittedTimes = function (eventName) {
				return capturedEvents.filter(e => e.eventName === eventName).length;
			};

			broker.test.eventEmittedWithParams = function (eventName, params) {
				return capturedEvents.some(e => {
					if (e.eventName !== eventName) return false;
					try {
						return JSON.stringify(e.payload) === JSON.stringify(params);
					} catch {
						return e.payload === params;
					}
				});
			};

			broker.test.getEvents = function (eventName) {
				if (eventName) {
					return capturedEvents.filter(e => e.eventName === eventName);
				}
				return [...capturedEvents];
			};

			broker.test.waitForEvent = function (eventName, timeout = 5000) {
				return new Promise((resolve, reject) => {
					// Check if already captured
					const existing = capturedEvents.find(e => e.eventName === eventName);
					if (existing) {
						resolve(existing);
						return;
					}

					const timer = setTimeout(() => {
						reject(new Error(`Timeout waiting for event "${eventName}" (${timeout}ms)`));
					}, timeout);

					const interval = setInterval(() => {
						const found = capturedEvents.find(e => e.eventName === eventName);
						if (found) {
							clearTimeout(timer);
							clearInterval(interval);
							resolve(found);
						}
					}, 10);
				});
			};

			broker.test.clearEvents = function () {
				capturedEvents.length = 0;
			};
		},

		emit(next) {
			return function (eventName, payload, opts) {
				recordEvent("emit", eventName, payload, opts);
				return next(eventName, payload, opts);
			};
		},

		broadcast(next) {
			return function (eventName, payload, opts) {
				recordEvent("broadcast", eventName, payload, opts);
				return next(eventName, payload, opts);
			};
		},

		broadcastLocal(next) {
			return function (eventName, payload, opts) {
				recordEvent("broadcastLocal", eventName, payload, opts);
				return next(eventName, payload, opts);
			};
		}
	};
};
