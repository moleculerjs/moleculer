/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

class Endpoint {
	constructor(registry, broker, node) {
		this.registry = registry;
		this.broker = broker;

		this.id = node.id;
		this.node = node;

		this.local = node.id === broker.nodeID;
		this.state = true;
	}

	get isAvailable() {
		return this.state;
	}
}

module.exports = Endpoint;
