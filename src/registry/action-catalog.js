/*
 * moleculer
 * Copyright (c) 2018 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const EndpointList = require("./endpoint-list");
const ActionEndpoint = require("./endpoint-action");
const ActionEndpointCB = require("./endpoint-cb");

/**
 * Catalog class to store service actions
 *
 * @class ActionCatalog
 */
class ActionCatalog {

	/**
	 * Creates an instance of ActionCatalog.
	 *
	 * @param {Registry} registry
	 * @param {ServiceBroker} broker
	 * @param {Strategy} StrategyFactory
	 * @memberof ActionCatalog
	 */
	constructor(registry, broker, StrategyFactory) {
		this.registry = registry;
		this.broker = broker;
		this.logger = registry.logger;
		this.StrategyFactory = StrategyFactory;

		this.actions = new Map();

		this.EndpointFactory = this.registry.opts.circuitBreaker && this.registry.opts.circuitBreaker.enabled ? ActionEndpointCB : ActionEndpoint;
	}

	/**
	 * Add an action
	 *
	 * @param {Node} node
	 * @param {ServiceItem} service
	 * @param {Action} action
	 * @memberof ActionCatalog
	 */
	add(node, service, action) {
		let list = this.actions.get(action.name);
		if (!list) {
			// Create a new EndpointList
			list = new EndpointList(this.registry, this.broker, action.name, null, this.EndpointFactory, this.StrategyFactory);
			this.actions.set(action.name, list);
		}

		list.add(node, service, action);

		return list;
	}

	/**
	 * Get action by name
	 *
	 * @param {String} actionName
	 * @returns
	 * @memberof ActionCatalog
	 */
	get(actionName) {
		return this.actions.get(actionName);
	}

	/**
	 * Check the action is available (there is live endpoint)
	 *
	 * @param {String} actionName
	 * @returns {Boolean}
	 * @memberof ActionCatalog
	 */
	isAvailable(actionName) {
		const list = this.actions.get(actionName);
		if (list)
			return list.hasAvailable();

		return false;
	}

	/**
	 * Remove all actions by service
	 *
	 * @param {ServiceItem} service
	 * @memberof ActionCatalog
	 */
	removeByService(service) {
		this.actions.forEach(list => {
			list.removeByService(service);
		});
	}

	/**
	 * Remove action by name & nodeID
	 *
	 * @param {String} actionName
	 * @param {String} nodeID
	 * @memberof ActionCatalog
	 */
	remove(actionName, nodeID) {
		const list = this.actions.get(actionName);
		if (list)
			list.removeByNodeID(nodeID);
	}

	/**
	 * Get a filtered list of actions
	 *
	 * @param {Object} {onlyLocal = false, skipInternal = false, withEndpoints = false}
	 * @returns {Array}
	 *
	 * @memberof ActionCatalog
	 */
	list({onlyLocal = false, skipInternal = false, withEndpoints = false}) {
		let res = [];

		this.actions.forEach((list, key) => {
			if (skipInternal && /^\$node/.test(key))
				return;

			if (onlyLocal && !list.hasLocal())
				return;

			let item = {
				name: key,
				count: list.count(),
				hasLocal: list.hasLocal(),
				available: list.hasAvailable()
			};

			if (item.count > 0) {
				const ep = list.endpoints[0];
				if (ep)
					item.action = _.omit(ep.action, ["handler", "service"]);
			}
			if (item.action == null || item.action.protected === true) return;

			if (withEndpoints) {
				if (item.count > 0) {
					item.endpoints = list.endpoints.map(ep => {
						return {
							nodeID: ep.node.id,
							state: ep.state
						};
					});
				}
			}

			res.push(item);
		});

		return res;
	}
}

module.exports = ActionCatalog;
