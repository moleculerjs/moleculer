/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const { MoleculerServerError } = require("../errors");

/**
 * Endpoint list class
 *
 * @class EndpointList
 */
class EndpointList {

	/**
	 * Creates an instance of EndpointList.
	 * @param {Registry} registry
	 * @param {ServiceBroker} broker
	 * @param {String} name
	 * @param {String} group
	 * @param {EndPointClass} EndPointFactory
	 * @param {Strategy} strategy
	 * @memberof EndpointList
	 */
	constructor(registry, broker, name, group, EndPointFactory, strategy) {
		this.registry = registry;
		this.broker = broker;
		this.logger = registry.logger;
		this.strategy = strategy;
		this.name = name;
		this.group = group;
		this.internal = name.startsWith("$");

		this.EndPointFactory = EndPointFactory;


		this.endpoints = [];
		this.localEndpoint = null;
	}

	/**
	 * Add a new endpoint
	 *
	 * @param {Node} node
	 * @param {Service} service
	 * @param {any} data
	 * @returns
	 * @memberof EndpointList
	 */
	add(node, service, data) {
		const found = this.endpoints.find(ep => ep.node == node);
		if (found) {
			found.update(data);
			return found;
		}

		const ep = new this.EndPointFactory(this.registry, this.broker, node, service, data);
		if (ep.local)
			this.localEndpoint = ep;

		this.endpoints.push(ep);
		return ep;
	}

	/**
	 * Select next endpoint with balancer strategy
	 *
	 * @returns
	 * @memberof EndpointList
	 */
	select() {
		const ret = this.strategy.select(this.endpoints);
		if (!ret) {
			throw new MoleculerServerError("Strategy returned an invalid endpoint.", 500, "INVALID_ENDPOINT", { strategy: typeof(this.strategy)});
		}
		return ret;
	}

	/**
	 * Get next endpoint
	 *
	 * @returns
	 * @memberof EndpointList
	 */
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

	/**
	 * Check there is available endpoint
	 *
	 * @returns
	 * @memberof EndpointList
	 */
	hasAvailable() {
		return this.endpoints.find(ep => ep.isAvailable) != null;
	}

	/**
	 * Check there is local endpoint
	 *
	 * @returns
	 * @memberof EndpointList
	 */
	hasLocal() {
		return this.localEndpoint != null;
	}

	/**
	 * Get count of endpoints
	 *
	 * @returns
	 * @memberof EndpointList
	 */
	count() {
		return this.endpoints.length;
	}

	/**
	 * Get endpoint on a specified node
	 *
	 * @param {String} nodeID
	 * @returns
	 * @memberof EndpointList
	 */
	getEndpointByNodeID(nodeID) {
		const ep = this.endpoints.find(ep => ep.id == nodeID);
		if (ep && ep.isAvailable)
			return ep;

		return null;
	}

	/**
	 * Check nodeID in the endpoint list
	 *
	 * @param {String} nodeID
	 * @returns
	 * @memberof EndpointList
	 */
	hasNodeID(nodeID) {
		return this.endpoints.find(ep => ep.id == nodeID) != null;
	}

	/**
	 * Remove all endpoints by service
	 *
	 * @param {ServiceItem} service
	 * @memberof EndpointList
	 */
	removeByService(service) {
		_.remove(this.endpoints, ep => ep.service == service);

		this.setLocalEndpoint();
	}

	/**
	 * Remove endpoints by node ID
	 *
	 * @param {String} nodeID
	 * @memberof EndpointList
	 */
	removeByNodeID(nodeID) {
		_.remove(this.endpoints, ep => ep.id == nodeID);

		this.setLocalEndpoint();
	}

	/**
	 * Set local endpoint
	 *
	 * @memberof EndpointList
	 */
	setLocalEndpoint() {
		this.localEndpoint = null;
		this.endpoints.forEach(ep => {
			if (ep.node.id == this.broker.nodeID)
				this.localEndpoint = ep;
		});
	}
}

module.exports = EndpointList;
