/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const { CIRCUIT_CLOSE, CIRCUIT_HALF_OPEN, CIRCUIT_OPEN } = require("../constants");

const ActionEndpoint = require("./endpoint-action");

class ActionEndpointCB extends ActionEndpoint {

	constructor(registry, broker, node, service, action) {
		super(registry, broker, node, service, action);

		this.opts = this.registry.opts.circuitBreaker;

		this.state = CIRCUIT_CLOSE;
		this.failures = 0;

		this.cbTimer = null;
	}

	get isAvailable() {
		return this.state === CIRCUIT_CLOSE || this.state === CIRCUIT_HALF_OPEN;
	}

	failure() {
		this.failures++;
		if (this.failures >= this.opts.maxFailures) {
			this.circuitOpen();
		}
	}

	circuitOpen() {
		this.state = CIRCUIT_OPEN;
		this.cbTimer = setTimeout(() => {
			this.circuitHalfOpen();
		}, this.opts.halfOpenTime);

		this.cbTimer.unref();

		this.broker.broadcastLocal("$circuit-breaker.opened", { node: this.node, action: this.action, failures: this.failures });

		if (this.broker.options.metrics)
			this.broker.emit("metrics.circuit-breaker.opened", { nodeID: this.node.id, action: this.action.name, failures: this.failures });
	}

	circuitHalfOpen() {
		this.state = CIRCUIT_HALF_OPEN;

		this.broker.broadcastLocal("$circuit-breaker.half-opened", { node: this.node, action: this.action });
		if (this.broker.options.metrics)
			this.broker.emit("metrics.circuit-breaker.half-opened", { nodeID: this.node.id, action: this.action.name });
	}

	circuitClose() {
		this.state = CIRCUIT_CLOSE;
		this.failures = 0;
		this.broker.broadcastLocal("$circuit-breaker.closed", { node: this.node, action: this.action });
		if (this.broker.options.metrics)
			this.broker.emit("metrics.circuit-breaker.closed", { nodeID: this.node.id, action: this.action.name });

	}
}

module.exports = ActionEndpointCB;
