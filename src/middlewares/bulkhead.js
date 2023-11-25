/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const { QueueIsFullError } = require("../errors");
const { METRIC } = require("../metrics");

module.exports = function bulkheadMiddleware(broker) {
	function wrapActionBulkheadMiddleware(handler, action) {
		const service = action.service;

		const opts = Object.assign({}, this.options.bulkhead || {}, action.bulkhead || {});
		if (opts.enabled) {
			const queue = [];
			let currentInFlight = 0;

			// Call the next request from the queue
			const callNext = function callNext() {
				/* istanbul ignore next */
				if (queue.length === 0) return;

				/* istanbul ignore next */
				if (currentInFlight >= opts.concurrency) return;

				const item = queue.shift();

				currentInFlight++;
				broker.metrics.set(METRIC.MOLECULER_REQUEST_BULKHEAD_INFLIGHT, currentInFlight, {
					action: action.name,
					service: service.fullName
				});
				broker.metrics.set(METRIC.MOLECULER_REQUEST_BULKHEAD_QUEUE_SIZE, queue.length, {
					action: action.name,
					service: service.fullName
				});

				handler(item.ctx)
					.then(res => {
						currentInFlight--;
						broker.metrics.set(
							METRIC.MOLECULER_REQUEST_BULKHEAD_INFLIGHT,
							currentInFlight,
							{ action: action.name, service: service.fullName }
						);
						broker.metrics.set(
							METRIC.MOLECULER_REQUEST_BULKHEAD_QUEUE_SIZE,
							queue.length,
							{ action: action.name, service: service.fullName }
						);
						item.resolve(res);
						callNext();
					})
					.catch(err => {
						currentInFlight--;
						broker.metrics.set(
							METRIC.MOLECULER_REQUEST_BULKHEAD_INFLIGHT,
							currentInFlight,
							{ action: action.name, service: service.fullName }
						);
						broker.metrics.set(
							METRIC.MOLECULER_REQUEST_BULKHEAD_QUEUE_SIZE,
							queue.length,
							{ action: action.name, service: service.fullName }
						);
						item.reject(err);
						callNext();
					});
			};

			return function bulkheadMiddleware(ctx) {
				// Call handler without waiting
				if (currentInFlight < opts.concurrency) {
					currentInFlight++;
					broker.metrics.set(
						METRIC.MOLECULER_REQUEST_BULKHEAD_INFLIGHT,
						currentInFlight,
						{ action: action.name, service: service.fullName }
					);
					broker.metrics.set(METRIC.MOLECULER_REQUEST_BULKHEAD_QUEUE_SIZE, queue.length, {
						action: action.name,
						service: service.fullName
					});
					return handler(ctx)
						.then(res => {
							currentInFlight--;
							broker.metrics.set(
								METRIC.MOLECULER_REQUEST_BULKHEAD_INFLIGHT,
								currentInFlight,
								{ action: action.name, service: service.fullName }
							);
							broker.metrics.set(
								METRIC.MOLECULER_REQUEST_BULKHEAD_QUEUE_SIZE,
								queue.length,
								{ action: action.name, service: service.fullName }
							);
							callNext();
							return res;
						})
						.catch(err => {
							currentInFlight--;
							broker.metrics.set(
								METRIC.MOLECULER_REQUEST_BULKHEAD_INFLIGHT,
								currentInFlight,
								{ action: action.name, service: service.fullName }
							);
							broker.metrics.set(
								METRIC.MOLECULER_REQUEST_BULKHEAD_QUEUE_SIZE,
								queue.length,
								{ action: action.name, service: service.fullName }
							);
							callNext();
							return broker.Promise.reject(err);
						});
				}

				// Check whether the queue is full
				if (opts.maxQueueSize && queue.length >= opts.maxQueueSize) {
					return broker.Promise.reject(
						new QueueIsFullError({ action: ctx.action.name, nodeID: ctx.nodeID })
					);
				}

				// Store the request in the queue
				const p = new Promise((resolve, reject) => queue.push({ resolve, reject, ctx }));
				broker.metrics.set(METRIC.MOLECULER_REQUEST_BULKHEAD_QUEUE_SIZE, queue.length, {
					action: action.name,
					service: service.fullName
				});

				return p;
			}.bind(this);
		}

		return handler;
	}

	function wrapEventBulkheadMiddleware(handler, event) {
		const service = event.service;

		const opts = Object.assign({}, this.options.bulkhead || {}, event.bulkhead || {});
		if (opts.enabled) {
			const queue = [];
			let currentInFlight = 0;

			// Call the next request from the queue
			const callNext = function callNext() {
				/* istanbul ignore next */
				if (queue.length === 0) return;

				/* istanbul ignore next */
				if (currentInFlight >= opts.concurrency) return;

				const item = queue.shift();

				currentInFlight++;
				broker.metrics.set(METRIC.MOLECULER_EVENT_BULKHEAD_INFLIGHT, currentInFlight, {
					event: event.name,
					service: service.fullName
				});
				broker.metrics.set(METRIC.MOLECULER_EVENT_BULKHEAD_QUEUE_SIZE, queue.length, {
					event: event.name,
					service: service.fullName
				});

				handler(item.ctx)
					.then(res => {
						currentInFlight--;
						broker.metrics.set(
							METRIC.MOLECULER_EVENT_BULKHEAD_INFLIGHT,
							currentInFlight,
							{ event: event.name, service: service.fullName }
						);
						broker.metrics.set(
							METRIC.MOLECULER_EVENT_BULKHEAD_QUEUE_SIZE,
							queue.length,
							{ event: event.name, service: service.fullName }
						);
						item.resolve(res);
						callNext();
					})
					.catch(err => {
						currentInFlight--;
						broker.metrics.set(
							METRIC.MOLECULER_EVENT_BULKHEAD_INFLIGHT,
							currentInFlight,
							{ event: event.name, service: service.fullName }
						);
						broker.metrics.set(
							METRIC.MOLECULER_EVENT_BULKHEAD_QUEUE_SIZE,
							queue.length,
							{ event: event.name, service: service.fullName }
						);
						item.reject(err);
						callNext();
					});
			};

			return function bulkheadMiddleware(ctx) {
				// Call handler without waiting
				if (currentInFlight < opts.concurrency) {
					currentInFlight++;
					broker.metrics.set(METRIC.MOLECULER_EVENT_BULKHEAD_INFLIGHT, currentInFlight, {
						event: event.name,
						service: service.fullName
					});
					broker.metrics.set(METRIC.MOLECULER_EVENT_BULKHEAD_QUEUE_SIZE, queue.length, {
						event: event.name,
						service: service.fullName
					});
					return handler(ctx)
						.then(res => {
							currentInFlight--;
							broker.metrics.set(
								METRIC.MOLECULER_EVENT_BULKHEAD_INFLIGHT,
								currentInFlight,
								{ event: event.name, service: service.fullName }
							);
							broker.metrics.set(
								METRIC.MOLECULER_EVENT_BULKHEAD_QUEUE_SIZE,
								queue.length,
								{ event: event.name, service: service.fullName }
							);
							callNext();
							return res;
						})
						.catch(err => {
							currentInFlight--;
							broker.metrics.set(
								METRIC.MOLECULER_EVENT_BULKHEAD_INFLIGHT,
								currentInFlight,
								{ event: event.name, service: service.fullName }
							);
							broker.metrics.set(
								METRIC.MOLECULER_EVENT_BULKHEAD_QUEUE_SIZE,
								queue.length,
								{ event: event.name, service: service.fullName }
							);
							callNext();
							return broker.Promise.reject(err);
						});
				}

				// Check whether the queue is full
				if (opts.maxQueueSize && queue.length >= opts.maxQueueSize) {
					return broker.Promise.reject(
						new QueueIsFullError({
							event: ctx.eventName,
							service: service.fullName,
							nodeID: ctx.nodeID
						})
					);
				}

				// Store the request in the queue
				const p = new Promise((resolve, reject) => queue.push({ resolve, reject, ctx }));
				broker.metrics.set(METRIC.MOLECULER_EVENT_BULKHEAD_QUEUE_SIZE, queue.length, {
					event: event.name,
					service: service.fullName
				});

				return p;
			}.bind(this);
		}

		return handler;
	}

	return {
		name: "Bulkhead",

		created() {
			if (broker.isMetricsEnabled()) {
				broker.metrics.register({
					name: METRIC.MOLECULER_REQUEST_BULKHEAD_INFLIGHT,
					type: METRIC.TYPE_GAUGE,
					labelNames: ["action", "service"]
				});
				broker.metrics.register({
					name: METRIC.MOLECULER_REQUEST_BULKHEAD_QUEUE_SIZE,
					type: METRIC.TYPE_GAUGE,
					labelNames: ["action", "service"]
				});

				broker.metrics.register({
					name: METRIC.MOLECULER_EVENT_BULKHEAD_INFLIGHT,
					type: METRIC.TYPE_GAUGE,
					labelNames: ["event", "service"]
				});
				broker.metrics.register({
					name: METRIC.MOLECULER_EVENT_BULKHEAD_QUEUE_SIZE,
					type: METRIC.TYPE_GAUGE,
					labelNames: ["event", "service"]
				});
			}
		},

		localAction: wrapActionBulkheadMiddleware,
		localEvent: wrapEventBulkheadMiddleware
	};
};
