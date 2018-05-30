/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const C = require("../constants");

/*
	TODO: move here CB logic from EndpointCB
*/

let windowTimer;
const store = new Map();

/**
 * Create timer to clear endpoint store
 *
 * @param {Number} windowTime
 */
function createWindowTimer(windowTime) {
	if (!windowTimer) {
		windowTimer = setInterval(() => resetStore(), (windowTime || 60) * 1000);
		windowTimer.unref();
	}
}

/**
 * Clear endpoint state store
 */
function resetStore() {
	store.clear();
}

/**
 * Get Endpoint state from store. If not exists, create it.
 *
 * @param {Endpoint} ep
 * @param {Object} opts
 * @returns {Object}
 */
function getEpState(ep, opts) {
	let item = store.get(ep.name);
	if (!item) {
		item = {
			ep,
			opts,
			count: 0,
			failures: 0,
			state: C.CIRCUIT_CLOSE
		};
		store.set(ep.name, item);
	}
	return item;
}

/**
 * Increment failure counter
 *
 * @param {Object} item
 * @param {Error} err
 * @param {Context} ctx
 */
function failure(item, err, ctx) {
	item.count++;
	item.failures++;

	checkThreshold(item, ctx);
}

/**
 * Increment request counter and switch CB to CLOSE if it is on HALF_OPEN_WAIT.
 *
 * @param {Object} item
 * @param {Context} ctx
 */
function success(item, ctx) {
	item.count++;

	if (item.state === C.CIRCUIT_HALF_OPEN_WAIT)
		circuitClose(item, ctx);
	else
		checkThreshold(item, ctx);
}

/**
 * Check circuit-breaker failure threshold of Endpoint
 *
 * @param {Object} item
 * @param {Context} ctx
 */
function checkThreshold(item, ctx) {
	if (item.count >= item.opts.minRequestCount) {
		const rate = item.failures / item.count;
		if (rate >= item.opts.threshold)
			circuitOpen(item, ctx);
	}
}

/**
 * Change circuit-breaker status to open
 *
 * @param {Object} item
 * @param {Context} ctx
 */
function circuitOpen(item, ctx) {
	item.state = C.CIRCUIT_OPEN;

	if (item.cbTimer) {
		clearTimeout(item.cbTimer);
	}

	item.cbTimer = setTimeout(() => {
		circuitHalfOpen(item);
	}, item.opts.halfOpenTime);

	item.cbTimer.unref();

	const rate = item.count > 0 ? item.failures / item.count : 0;
	ctx.broker.broadcastLocal("$circuit-breaker.opened", { nodeID: item.ep.id, action: item.ep.action.name, failures: item.failures, count: item.count, rate });

	// TODO: move to Metrics middleware
	if (ctx.broker.options.metrics)
		ctx.broker.emit("metrics.circuit-breaker.opened", { nodeID: item.ep.id, action: item.ep.action.name, failures: item.failures, count: item.count, rate });
}

/**
 * Change circuit-breaker status to half-open
 *
 * @param {Object} item
 * @param {Context} ctx
 */
function circuitHalfOpen(item, ctx) {
	item.state = C.CIRCUIT_HALF_OPEN;

	item.broker.broadcastLocal("$circuit-breaker.half-opened", { nodeID: item.ep.id, action: item.ep.action.name });
	// TODO: move to Metrics middleware
	if (item.broker.options.metrics)
		item.broker.emit("metrics.circuit-breaker.half-opened", { nodeID: item.ep.id, action: item.ep.action.name });

	if (item.cbTimer) {
		clearTimeout(item.cbTimer);
	}
}

/**
 * Change circuit-breaker status to half-open waiting. First request is invoked after half-open.
 *
 * @param {Object} item
 * @param {Context} ctx
*/
function circuitHalfOpenWait(item, ctx) {
	item.state = C.CIRCUIT_HALF_OPEN_WAIT;

	// Anti-stick protection
	item.cbTimer = setTimeout(() => {
		circuitHalfOpen(item, ctx);
	}, item.opts.halfOpenTime);
	item.cbTimer.unref();
}

/**
 * Change circuit-breaker status to close
 *
 * @param {Object} item
 * @param {Context} ctx
 */
function circuitClose(item, ctx) {
	item.state = C.CIRCUIT_CLOSE;
	item.failures = 0;
	item.count = 0;
	ctx.broker.broadcastLocal("$circuit-breaker.closed", { nodeID: item.ep.id, action: item.ep.action.name });
	// TODO: move to Metrics middleware
	if (ctx.broker.options.metrics)
		ctx.broker.emit("metrics.circuit-breaker.closed", { nodeID: item.ep.id, action: item.ep.action.name });

	if (item.cbTimer) {
		clearTimeout(item.cbTimer);
	}
}

/**
 * Middleware wrapper function
 *
 * @param {Function} handler
 * @param {Action} action
 * @returns {Function}
 */
function wrapCBMiddleware(handler, action) {
	// Merge action option and broker options
	const opts = Object.assign({}, this.options.circuitBreaker || {}, action.circuitBreaker || {});

	createWindowTimer(opts.windowTimer);

	if (opts.enabled) {
		return function circuitBreakerMiddleware(ctx) {
			// Get endpoint state item
			const ep = ctx.endpoint;
			const item = getEpState(ep, opts);

			// Handle half-open state in circuit breaker
			if (item.state == C.CIRCUIT_HALF_OPEN) {
				circuitHalfOpenWait(item, ctx);
			}

			// Call the handler
			return handler(ctx).then(res => {
				const item = getEpState(ep, opts);
				success(item, ctx);

				return res;
			}).catch(err => {
				if (opts.check && opts.check(err)) {
					// Failure if error is created locally (not a 3rd node error)
					if (item && (!err.nodeID || err.nodeID == ctx.nodeID)) {
						const item = getEpState(ep, opts);
						failure(item, err, ctx);
					}
				}

				return this.Promise.reject(err);
			});
		}.bind(this);
	}

	return handler;
}

module.exports = function() {
	return {
		localAction: wrapCBMiddleware,
		remoteAction: wrapCBMiddleware
	};
};
