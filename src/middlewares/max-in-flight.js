/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const Promise = require("bluebird");
const { QueueIsFullError } = require("../errors");

function wrapMaxInFlightMiddleware(handler, action) {
	const opts = Object.assign({}, this.options.maxInFlight || {}, action.maxInFlight || {});
	if (opts.enabled) {
		const queue = [];
		let currentInFlight = 0;

		// Call the next request from the queue
		const callNext = function callNext() {
			if (queue.length == 0) return;
			if (currentInFlight >= opts.limit) return;

			const item = queue.shift();

			currentInFlight++;
			handler(item.ctx)
				.then(res => {
					currentInFlight--;
					item.resolve(res);
					callNext();
				})
				.catch(err => {
					currentInFlight--;
					item.reject(err);
					callNext();
				});
		};

		return function MaxInFlightMiddleware(ctx) {
			// Call handler without waiting
			if (currentInFlight < opts.limit) {
				currentInFlight++;
				return handler(ctx)
					.then(res => {
						currentInFlight--;
						callNext();
						return res;
					})
					.catch(err => {
						currentInFlight--;
						callNext();
						return err;
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

module.exports = function MaxInFlightMiddleware() {
	return {
		localAction: wrapMaxInFlightMiddleware
	};
};
