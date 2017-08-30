/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const { MoleculerError } = require("../errors");

class EndpointList {

	constructor(registry, broker, logger, name, EndPointFactory, strategy) {
		this.registry = registry;
		this.broker = broker;
		this.logger = logger;
		this.strategy = strategy;
		this.name = name;
		this.internal = name.startsWith("$");

		this.EndPointFactory = EndPointFactory;


		this.endpoints = [];
		this.localEndpoint = null;
	}

	add(node, service, data) {
		const found = this.endpoints.find(ep => ep.node == node);
		if (found) {
			return found.update(data);
		}

		const ep = new this.EndPointFactory(this.registry, this.broker, node, service, data);
		if (ep.local)
			this.localEndpoint = ep;

		this.endpoints.push(ep);
	}

	select() {
		const ret = this.registry.strategy.select(this.endpoints);
		if (!ret) {
			throw new MoleculerError(`Strategy ${typeof(this.getStrategy())} returned an invalid endpoint.`);
		}
		return ret;
	}

	next() {
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
			if (item.isAvailable)
				return item;

			return null;
		}

		// Search local item
		if (this.registry.opts.preferLocal === true && this.localEndpoint && this.localEndpoint.isAvailable) {
			return this.localEndpoint;
		}

		const max = this.endpoints.length;
		let i = 0;
		while (i < max) {
			const ep = this.select();
			if (ep.isAvailable)
				return ep;

			i++;
		}

		return null;
	}

	hasAvailable() {
		return this.endpoints.find(ep => ep.isAvailable) != null;
	}

	hasLocal() {
		return this.localEndpoint != null;
	}

	count() {
		return this.endpoints.length;
	}

	getEndpointByNodeID(nodeID) {
		const ep = this.endpoints.find(ep => ep.id == nodeID);
		if (ep && ep.isAvailable)
			return ep;

		return null;
	}

	hasNodeID(nodeID) {
		return this.endpoints.find(ep => ep.id == nodeID) != null;
	}

	removeByService(service) {
		_.remove(this.endpoints, ep => ep.service == service);

		this.setLocalEndpoint();
	}

	removeByNodeID(nodeID) {
		_.remove(this.endpoints, ep => ep.id == nodeID);

		this.setLocalEndpoint();
	}

	setLocalEndpoint() {
		this.localEndpoint = null;
		this.endpoints.forEach(ep => {
			if (ep.node.id == this.broker.nodeID)
				this.localEndpoint = ep;
		});
	}
}

module.exports = EndpointList;
