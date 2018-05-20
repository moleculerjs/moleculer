/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const { CIRCUIT_CLOSE, CIRCUIT_HALF_OPEN, CIRCUIT_HALF_OPEN_WAIT, CIRCUIT_OPEN } = require("../constants");
const { RequestTimeoutError } = require("../errors");

const ActionEndpoint = require("./endpoint-action");

/**
 * Action endpoint, which protected with circuit breaker logic
 *
 * @class ActionEndpointCB
 * @extends {ActionEndpoint}
 */
class ActionEndpointCB extends ActionEndpoint {

	/**
	 * Creates an instance of ActionEndpointCB.
	 * @param {Registry} registry
	 * @param {ServiceBroker} broker
	 * @param {Node} node
	 * @param {ServiceItem} service
	 * @param {any} action
	 * @memberof ActionEndpointCB
	 */
	constructor(registry, broker, node, service, action) {
		super(registry, broker, node, service, action);

		this.opts = _.defaultsDeep(this.registry.opts.circuitBreaker, {
			threshold: 0.5,
			windowTime: 60,
			minRequestCount: 20,
		});

		this.state = CIRCUIT_CLOSE;
		this.failures = 0;
		this.reqCount = 0;

		this.cbTimer = null;
		// FIXME: optimize timers
		this.windowTimer = setInterval(() => {
			this.failures = 0;
			this.reqCount = 0;
		}, (this.opts.windowTime || 60) * 1000);

		// TODO destroy timer if action is destroyed
	}

	/**
	 * Get availability
	 *
	 * @readonly
	 * @memberof ActionEndpointCB
	 */
	get isAvailable() {
		return this.state === CIRCUIT_CLOSE || this.state === CIRCUIT_HALF_OPEN;
	}

	/**
	 * Increment failure counter
	 *
	 * @memberof ActionEndpointCB
	 */
	failure(err) {
		this.reqCount++;
		if (err) {
			if (err instanceof RequestTimeoutError) {
				if (this.opts.failureOnTimeout)
					this.failures++;

			} else if (err.code >= 500 && this.opts.failureOnReject) {
				this.failures++;
			}

			this.checkThreshold();
		}
	}

	/**
	 * Increment request counter and switch CB to CLOSE if it is on HALF_OPEN_WAIT.
	 *
	 * @memberof ActionEndpointCB
	 */
	success() {
		this.reqCount++;

		if (this.state === CIRCUIT_HALF_OPEN_WAIT)
			this.circuitClose();
		else
			this.checkThreshold();
	}

	checkThreshold() {
		if (this.reqCount >= this.opts.minRequestCount) {
			const rate = this.failures / this.reqCount;
			if (rate >= this.opts.threshold)
				this.circuitOpen();
		}
	}

	/**
	 * Change circuit-breaker status to open
	 *
	 * @memberof ActionEndpointCB
	 */
	circuitOpen() {
		this.state = CIRCUIT_OPEN;

		if (this.cbTimer) {
			clearTimeout(this.cbTimer);
		}

		this.cbTimer = setTimeout(() => {
			this.circuitHalfOpen();
		}, this.opts.halfOpenTime);

		this.cbTimer.unref();

		const rate = this.reqCount > 0 ? this.failures / this.reqCount : 0;
		this.broker.broadcastLocal("$circuit-breaker.opened", { nodeID: this.node.id, action: this.action.name, failures: this.failures, reqCount: this.reqCount, rate });

		if (this.broker.options.metrics)
			this.broker.emit("metrics.circuit-breaker.opened", { nodeID: this.node.id, action: this.action.name, failures: this.failures, reqCount: this.reqCount, rate });
	}

	/**
	 * Change circuit-breaker status to half-open
	 *
	 * @memberof ActionEndpointCB
	 */
	circuitHalfOpen() {
		this.state = CIRCUIT_HALF_OPEN;

		this.broker.broadcastLocal("$circuit-breaker.half-opened", { nodeID: this.node.id, action: this.action.name });
		if (this.broker.options.metrics)
			this.broker.emit("metrics.circuit-breaker.half-opened", { nodeID: this.node.id, action: this.action.name });

		if (this.cbTimer) {
			clearTimeout(this.cbTimer);
		}
	}

	/**
	 * Change circuit-breaker status to half-open waiting. First request is invoked after half-open.
	 *
	 * @memberof ActionEndpointCB
	 */
	circuitHalfOpenWait() {
		this.state = CIRCUIT_HALF_OPEN_WAIT;

		// Anti-stick protection
		this.cbTimer = setTimeout(() => {
			this.circuitHalfOpen();
		}, this.opts.halfOpenTime);
		this.cbTimer.unref();
	}

	/**
	 * Change circuit-breaker status to close
	 *
	 * @memberof ActionEndpointCB
	 */
	circuitClose() {
		this.state = CIRCUIT_CLOSE;
		this.failures = 0;
		this.passes = 0;
		this.broker.broadcastLocal("$circuit-breaker.closed", { nodeID: this.node.id, action: this.action.name });
		if (this.broker.options.metrics)
			this.broker.emit("metrics.circuit-breaker.closed", { nodeID: this.node.id, action: this.action.name });

		if (this.cbTimer) {
			clearTimeout(this.cbTimer);
		}
	}
}

module.exports = ActionEndpointCB;
