/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const { MoleculerError } = require("../errors");
const Endpoint = require("./endpoint");

class EndpointList {

	constructor(registry, broker, logger, name) {
		this.registry = registry;
		this.broker = broker;
		this.logger = logger;
		this.name = name;
		this.internal = name.startsWith("$");


		this.endpoints = [];
		this.localEndpoint = null;
	}

	add(node, service, action) {
		const found = this.endpoints.find(ep => ep.node == node);
		if (found) {
			return found.updateAction(action);
		}

		const ep = new Endpoint(this.registry, this.broker, node, service, action);
		if (ep.local)
			this.localEndpoint = ep;

		this.endpoints.push(ep);
	}

	getEndpointByNodeID(nodeID) {
		const ep = this.list.find(ep => ep.id == nodeID);
		if (ep && ep.isAvailable())
			return ep;

		return null;
	}

	select() {
		const ret = this.registry.strategy.select(this.endpoints);
		if (!ret) {
			throw new MoleculerError(`Strategy ${typeof(this.getStrategy())} returned an invalid endpoint.`);
		}
		return ret;
	}

	nextAvailable() {
		// No items
		if (this.endpoints.length === 0) {
			return null;
		}

		// If internal, return the local always
		if (this.internal) {
			return this.localEndpoint;
		}

		// Only 1 item
		if (this.endpoints.length === 1) {
			// No need to select a node, return the only one
			const item = this.endpoints[0];
			if (item.isAvailable())
				return item;

			return null;
		}

		// Search local item
		if (this.registry.opts.preferLocal === true && this.localEndpoint && this.localEndpoint.available()) {
			return this.localEndpoint;
		}

		const max = this.endpoints.length;
		let i = 0;
		while (i < max) {
			const ep = this.select();
			if (ep.isAvailable())
				return ep;

			i++;
		}

		return null;
	}
}

module.exports = EndpointList;
