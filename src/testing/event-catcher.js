/*
 * moleculer
 * Copyright (c) 2024 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const EventEmitter = require("events");

/**
 * EventCatcher middleware for Moleculer testing.
 *
 * Intercepts `emit`, `broadcast`, and `broadcastLocal` calls on the broker,
 * recording every event for later assertion. Attaches a `broker.test` namespace
 * with assertion helpers.
 *
 * Usage (standalone):
 *   broker = new ServiceBroker({ middlewares: [EventCatcher()] });
 *
 * Usage (via createBroker):
 *   broker = createBroker(); // EventCatcher included automatically
 *
 * @returns {Object} Moleculer middleware object
 */
function EventCatcher() {
	/** @type {Array<{type: string, eventName: string, payload: *, opts: *}>} */
	const capturedEvents = [];

	/** Internal emitter used to wake up waitForEvent promises without polling */
	const notifier = new EventEmitter();
	notifier.setMaxListeners(100);

	/**
	 * Record an intercepted event.
	 * @param {string} type - "emit" | "broadcast" | "broadcastLocal"
	 * @param {string} eventName
	 * @param {*} payload
	 * @param {*} opts
	 */
	function recordEvent(type, eventName, payload, opts) {
		const entry = { type, eventName, payload, opts };
		capturedEvents.push(entry);
		notifier.emit(eventName, entry);
	}

	return {
		name: "EventCatcher",

		/**
		 * Called by Moleculer after the broker is created.
		 * Attaches assertion helpers to `broker.test`.
		 * @param {import("../service-broker")} broker
		 */
		created(broker) {
			if (!broker.test) broker.test = {};

			/**
			 * Check whether a named event was emitted at least once.
			 * @param {string} eventName
			 * @returns {boolean}
			 */
			broker.test.eventEmitted = function eventEmitted(eventName) {
				return capturedEvents.some(e => e.eventName === eventName);
			};

			/**
			 * Return the number of times a named event was emitted.
			 * @param {string} eventName
			 * @returns {number}
			 */
			broker.test.eventEmittedTimes = function eventEmittedTimes(eventName) {
				return capturedEvents.filter(e => e.eventName === eventName).length;
			};

			/**
			 * Check whether a named event was emitted with a specific payload.
			 * Uses deep equality (JSON serialization).
			 * @param {string} eventName
			 * @param {*} params
			 * @returns {boolean}
			 */
			broker.test.eventEmittedWithParams = function eventEmittedWithParams(
				eventName,
				params
			) {
				const expected = JSON.stringify(params);
				return capturedEvents.some(e => {
					if (e.eventName !== eventName) return false;
					return JSON.stringify(e.payload) === expected;
				});
			};

			/**
			 * Return captured events, optionally filtered by name.
			 * @param {string} [eventName] - If provided, return only events with this name.
			 * @returns {Array}
			 */
			broker.test.getEvents = function getEvents(eventName) {
				if (eventName) return capturedEvents.filter(e => e.eventName === eventName);
				return capturedEvents.slice();
			};

			/**
			 * Wait until the named event is emitted (or has already been captured).
			 * Resolves with the event entry. Rejects after `timeout` ms.
			 *
			 * @param {string} eventName
			 * @param {number} [timeout=5000] - Milliseconds before rejecting
			 * @returns {Promise<{type: string, eventName: string, payload: *, opts: *}>}
			 */
			broker.test.waitForEvent = function waitForEvent(eventName, timeout = 5000) {
				// Check if already captured
				const existing = capturedEvents.find(e => e.eventName === eventName);
				if (existing) return Promise.resolve(existing);

				return new Promise((resolve, reject) => {
					let timer;

					function onEvent(entry) {
						clearTimeout(timer);
						resolve(entry);
					}

					timer = setTimeout(() => {
						notifier.removeListener(eventName, onEvent);
						reject(
							new Error(
								`Timeout waiting for event "${eventName}" after ${timeout}ms`
							)
						);
					}, timeout);

					notifier.once(eventName, onEvent);
				});
			};

			/**
			 * Clear all captured event records.
			 */
			broker.test.clearEvents = function clearEvents() {
				capturedEvents.length = 0;
			};
		},

		/** @param {Function} next */
		emit(next) {
			return function (eventName, payload, opts) {
				recordEvent("emit", eventName, payload, opts);
				return next(eventName, payload, opts);
			};
		},

		/** @param {Function} next */
		broadcast(next) {
			return function (eventName, payload, opts) {
				recordEvent("broadcast", eventName, payload, opts);
				return next(eventName, payload, opts);
			};
		},

		/** @param {Function} next */
		broadcastLocal(next) {
			return function (eventName, payload, opts) {
				recordEvent("broadcastLocal", eventName, payload, opts);
				return next(eventName, payload, opts);
			};
		}
	};
}

module.exports = EventCatcher;
