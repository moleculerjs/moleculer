/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const Strategies = require("../strategies");
const EndpointList = require("./endpoint-list");
const ActionEndpoint = require("./endpoint-action");

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

		this.EndpointFactory = ActionEndpoint;
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
			const strategyFactory = action.strategy
				? Strategies.resolve(action.strategy) || this.StrategyFactory
				: this.StrategyFactory;
			const strategyOptions = action.strategyOptions
				? action.strategyOptions
				: this.registry.opts.strategyOptions;
			// Create a new EndpointList
			list = new EndpointList(
				this.registry,
				this.broker,
				action.name,
				null,
				this.EndpointFactory,
				strategyFactory,
				strategyOptions
			);
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
		if (list) return list.hasAvailable();

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
		if (list) list.removeByNodeID(nodeID);
	}

	/**
	 * Get a filtered list of actions
	 *
	 * @param {Object} {onlyLocal = false, onlyAvailable = false, skipInternal = false, withEndpoints = false}
	 * @returns {Array}
	 *
	 * @memberof ActionCatalog
	 */
	list({
		onlyLocal = false,
		onlyAvailable = false,
		skipInternal = false,
		withEndpoints = false
	}) {
		let res = [];

		this.actions.forEach((list, key) => {
			if (skipInternal && /^\$/.test(key)) return;

			if (onlyLocal && !list.hasLocal()) return;

			if (onlyAvailable && !list.hasAvailable()) return;

			let item = {
				name: key,
				count: list.count(),
				hasLocal: list.hasLocal(),
				available: list.hasAvailable()
			};

			if (item.count > 0) {
				const ep = list.endpoints[0];
				if (ep) item.action = _.omit(ep.action, ["handler", "remoteHandler", "service"]);
			}
			if (item.action && item.action.protected === true) return;

			if (withEndpoints) {
				if (item.count > 0) {
					item.endpoints = list.endpoints.map(ep => {
						return {
							nodeID: ep.node.id,
							state: ep.state,
							available: ep.node.available
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
