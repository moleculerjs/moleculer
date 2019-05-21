/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const C = require("../constants");

module.exports = function(broker) {

	let windowTimer;
	const store = new Map();
	let logger;

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
		if (!logger) return;

		logger.debug("Reset circuit-breaker endpoint states...");
		store.forEach((item, key) => {
			if (item.count == 0) {
				logger.debug(`Remove '${key}' endpoint state because it is not used`);
				store.delete(key);
				return;
			}

			logger.debug(`Clean '${key}' endpoint state.`);
			item.count = 0;
			item.failures = 0;
		});
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
				state: C.CIRCUIT_CLOSE,
				cbTimer: null
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
				trip(item, ctx);
		}
	}

	/**
	 * Trip the circuit-breaker, change the status to open
	 *
	 * @param {Object} item
	 * @param {Context} ctx
	 */
	function trip(item, ctx) {
		if (item.state == C.CIRCUIT_OPEN) return;

		item.state = C.CIRCUIT_OPEN;
		item.ep.state = false;

		if (item.cbTimer) {
			clearTimeout(item.cbTimer);
			item.cbTimer = null;
		}

		item.cbTimer = setTimeout(() => halfOpen(item, ctx), item.opts.halfOpenTime);
		item.cbTimer.unref();

		const rate = item.count > 0 ? item.failures / item.count : 0;
		logger.debug(`Circuit breaker has been opened on '${item.ep.name}' endpoint.`, { nodeID: item.ep.id, action: item.ep.action.name, failures: item.failures, count: item.count, rate });
		broker.broadcast("$circuit-breaker.opened", { nodeID: item.ep.id, action: item.ep.action.name, failures: item.failures, count: item.count, rate });
	}

	/**
	 * Change circuit-breaker status to half-open
	 *
	 * @param {Object} item
	 * @param {Context} ctx
	 */
	function halfOpen(item) {
		item.state = C.CIRCUIT_HALF_OPEN;
		item.ep.state = true;

		logger.debug(`Circuit breaker has been half-opened on '${item.ep.name}' endpoint.`, { nodeID: item.ep.id, action: item.ep.action.name });

		broker.broadcast("$circuit-breaker.half-opened", { nodeID: item.ep.id, action: item.ep.action.name });

		if (item.cbTimer) {
			clearTimeout(item.cbTimer);
			item.cbTimer = null;
		}
	}

	/**
	 * Change circuit-breaker status to half-open waiting. First request is invoked after half-open.
	 *
	 * @param {Object} item
	 * @param {Context} ctx
	*/
	function halfOpenWait(item, ctx) {
		item.state = C.CIRCUIT_HALF_OPEN_WAIT;
		item.ep.state = false;

		// Anti-stick protection
		item.cbTimer = setTimeout(() => halfOpen(item, ctx), item.opts.halfOpenTime);
		item.cbTimer.unref();
	}

	/**
	 * Change circuit-breaker status to close
	 *
	 * @param {Object} item
	 * @param {Context} ctx
	 */
	function circuitClose(item) {
		item.state = C.CIRCUIT_CLOSE;
		item.ep.state = true;
		item.failures = 0;
		item.count = 0;

		logger.debug(`Circuit breaker has been closed on '${item.ep.name}' endpoint.`, { nodeID: item.ep.id, action: item.ep.action.name });

		broker.broadcast("$circuit-breaker.closed", { nodeID: item.ep.id, action: item.ep.action.name });

		if (item.cbTimer) {
			clearTimeout(item.cbTimer);
			item.cbTimer = null;
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
		if (opts.enabled) {
			return function circuitBreakerMiddleware(ctx) {
				// Get endpoint state item
				const ep = ctx.endpoint;
				const item = getEpState(ep, opts);

				// Handle half-open state in circuit breaker
				if (item.state == C.CIRCUIT_HALF_OPEN) {
					halfOpenWait(item, ctx);
				}

				// Call the handler
				return handler(ctx).then(res => {
					const item = getEpState(ep, opts);
					success(item, ctx);

					return res;
				}).catch(err => {
					if (opts.check && opts.check(err)) {
						// Failure if error is created locally (not came from a 3rd node error)
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


	return {
		created(broker) {
			logger = broker.getLogger("circuit-breaker");

			const opts = broker.options.circuitBreaker;
			if (opts.enabled)
				createWindowTimer(opts.windowTime);
		},

		localAction: wrapCBMiddleware,
		remoteAction: wrapCBMiddleware,

		stopped() {
			if (windowTimer) {
				clearInterval(windowTimer);
			}

		}
	};
};
