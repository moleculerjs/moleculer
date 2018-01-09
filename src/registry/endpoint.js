/*
 * moleculer
 * Copyright (c) 2018 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

/**
 * Endpoint class
 *
 * @class Endpoint
 */
class Endpoint {
	/**
	 * Creates an instance of Endpoint.
	 * @param {Registry} registry
	 * @param {ServiceBroker} broker
	 * @param {Node} node
	 * @memberof Endpoint
	 */
	constructor(registry, broker, node) {
		this.registry = registry;
		this.broker = broker;

		this.id = node.id;
		this.node = node;

		this.local = node.id === broker.nodeID;
		this.state = true;
	}

	/**
	 * Get availability
	 *
	 * @readonly
	 * @memberof Endpoint
	 */
	get isAvailable() {
		return this.state;
	}

	update() {
	}

	failure() {

	}

	success() {

	}
}

module.exports = Endpoint;
