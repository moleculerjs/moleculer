/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const Promise = require("bluebird");
const { QueueIsFullError } = require("../errors");
const { METRIC }	= require("../metrics");

module.exports = function bulkheadMiddleware(broker) {

	function wrapBulkheadMiddleware(handler, action) {
		const opts = Object.assign({}, this.options.bulkhead || {}, action.bulkhead || {});
		if (opts.enabled) {
			const queue = [];
			let currentInFlight = 0;

			// Call the next request from the queue
			const callNext = function callNext() {
			/* istanbul ignore next */
				if (queue.length == 0) return;

				/* istanbul ignore next */
				if (currentInFlight >= opts.concurrency) return;

				const item = queue.shift();

				currentInFlight++;
				handler(item.ctx)
					.then(res => {
						currentInFlight--;
						broker.metrics.set(METRIC.MOLECULER_REQUEST_BULKHEAD_INFLIGHT, currentInFlight, { action: action.name });
						item.resolve(res);
						callNext();
					})
					.catch(err => {
						currentInFlight--;
						broker.metrics.set(METRIC.MOLECULER_REQUEST_BULKHEAD_INFLIGHT, currentInFlight, { action: action.name });
						item.reject(err);
						callNext();
					});
			};

			return function bulkheadMiddleware(ctx) {
			// Call handler without waiting
				if (currentInFlight < opts.concurrency) {
					currentInFlight++;
					broker.metrics.set(METRIC.MOLECULER_REQUEST_BULKHEAD_INFLIGHT, currentInFlight, { action: action.name });
					return handler(ctx)
						.then(res => {
							currentInFlight--;
							broker.metrics.set(METRIC.MOLECULER_REQUEST_BULKHEAD_INFLIGHT, currentInFlight, { action: action.name });
							callNext();
							return res;
						})
						.catch(err => {
							currentInFlight--;
							broker.metrics.set(METRIC.MOLECULER_REQUEST_BULKHEAD_INFLIGHT, currentInFlight, { action: action.name });
							callNext();
							return Promise.reject(err);
						});
				}

				// Check whether the queue is full
				if (queue.length >= opts.maxQueueSize) {
					return Promise.reject(new QueueIsFullError({ action: ctx.action.name, nodeID: ctx.nodeID }));
				}

				// Store the request in the queue
				return new Promise((resolve, reject) => queue.push({ resolve, reject, ctx }));

			}.bind(this);
		}

		return handler;
	}

	return {
		created(broker) {
			if (broker.isMetricsEnabled()) {
				broker.metrics.register({ name: METRIC.MOLECULER_REQUEST_BULKHEAD_INFLIGHT, type: METRIC.TYPE_GAUGE, labelNames: ["action"] });
			}
		},

		localAction: wrapBulkheadMiddleware
	};
};
