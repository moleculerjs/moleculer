/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
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
	 * @param {Strategy} StrategyFactory
	 * @memberof EndpointList
	 */
	constructor(registry, broker, name, group, EndPointFactory, StrategyFactory) {
		this.registry = registry;
		this.broker = broker;
		this.logger = registry.logger;
		this.strategy = new StrategyFactory(registry, broker);
		this.name = name;
		this.group = group;
		this.internal = name.startsWith("$");

		this.EndPointFactory = EndPointFactory;

		this.endpoints = [];

		this.localEndpoints = [];
		this.localStrategy = new StrategyFactory(registry, broker);
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
		const found = this.endpoints.find(ep => ep.node == node && ep.service.name == service.name);
		if (found) {
			found.update(data);
			return found;
		}

		const ep = new this.EndPointFactory(this.registry, this.broker, node, service, data);
		this.endpoints.push(ep);

		this.setLocalEndpoints();

		return ep;
	}

	/**
	 * Get first endpoint
	 *
	 * @returns {Endpoint}
	 * @memberof EndpointList
	 */
	getFirst() {
		if (this.endpoints.length > 0)
			return this.endpoints[0];

		return null;
	}

	/**
	 * Select next endpoint with balancer strategy
	 *
	 * @param {Array<Endpoint>} list
	 * @param {Context} ctx
	 * @returns {Endpoint}
	 * @memberof EndpointList
	 */
	select(list, ctx) {
		const ret = this.strategy.select(list, ctx);
		if (!ret) {
			/* istanbul ignore next */
			throw new MoleculerServerError("Strategy returned an invalid endpoint.", 500, "INVALID_ENDPOINT", { strategy: typeof(this.strategy) });
		}
		return ret;
	}

	/**
	 * Get next endpoint
	 *
	 * @param {Context} ctx
	 * @returns
	 * @memberof EndpointList
	 */
	next(ctx) {
		// No items
		if (this.endpoints.length === 0) {
			return null;
		}

		// If internal (service), return the local always
		if (this.internal && this.hasLocal()) {
			return this.nextLocal();
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
		if (this.registry.opts.preferLocal === true && this.hasLocal()) {
			const ep = this.nextLocal(ctx);
			if (ep && ep.isAvailable)
				return ep;
		}

		const epList = this.endpoints.filter(ep => ep.isAvailable);
		if (epList.length == 0)
			return null;

		return this.select(epList, ctx);
	}

	/**
	 * Get next local endpoint
	 *
	 * @param {Context} ctx
	 * @returns
	 * @memberof EndpointList
	 */
	nextLocal(ctx) {
		// No items
		if (this.localEndpoints.length === 0) {
			return null;
		}

		// Only 1 item
		if (this.localEndpoints.length === 1) {
			// No need to select a node, return the only one
			const item = this.localEndpoints[0];
			if (item.isAvailable)
				return item;

			return null;
		}

		const epList = this.localEndpoints.filter(ep => ep.isAvailable);
		if (epList.length == 0)
			return null;

		return this.select(epList, ctx);
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
		return this.localEndpoints.length > 0;
	}

	/**
	 * Set local endpoint
	 *
	 * @memberof EndpointList
	 */
	setLocalEndpoints() {
		this.localEndpoints = this.endpoints.filter(ep => ep.local);
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
		_.remove(this.endpoints, ep => {
			if (ep.service == service) {
				ep.destroy();
				return true;
			}
		});

		this.setLocalEndpoints();
	}

	/**
	 * Remove endpoints by node ID
	 *
	 * @param {String} nodeID
	 * @memberof EndpointList
	 */
	removeByNodeID(nodeID) {
		_.remove(this.endpoints, ep => {
			if (ep.id == nodeID) {
				ep.destroy();
				return true;
			}
		});

		this.setLocalEndpoints();
	}
}

module.exports = EndpointList;
