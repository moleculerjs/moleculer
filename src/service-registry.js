/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");

const RoundRobinStrategy = require("./strategies/round-robin");

// Circuit-breaker states
const { CIRCUIT_CLOSE, CIRCUIT_HALF_OPEN, CIRCUIT_OPEN } = require("./constants");

//const { MoleculerError } = require("./errors");

let LOCAL_NODE_ID;

class ServiceRegistry {
	/**
	 * Creates an instance of ServiceRegistry.
	 *
	 * @param {Object} opts
	 * 		opts.strategy - type of balancing (defaults: new RoundRobinStrategy())
	 * 		opts.preferLocal - call the local service if available (defaults: true)
	 *
	 * @memberOf ServiceRegistry
	 */
	constructor(opts) {
		this.opts = _.defaultsDeep({}, opts, {
			strategy: new RoundRobinStrategy(),
			preferLocal: true
		});

		this.services = [];

		this.actions = new Map();
	}

	/**
	 * Initialize Service Registry
	 *
	 * @param {any} broker
	 *
	 * @memberof ServiceRegistry
	 */
	init(broker) {
		this.broker = broker;
		this.opts.strategy.init(broker);
		LOCAL_NODE_ID = this.broker.LOCAL_NODE_ID;
	}

	/**
	 * Register a service
	 *
	 * @param {String?} nodeID		NodeID if it is on a remote server/node
	 * @param {Service} service		Service instance
	 *
	 * @memberOf ServiceRegistry
	 */
	registerService(nodeID, service) {
		let item = this.findServiceByNode(nodeID, service.name, service.version);
		if (!item) {
			item = new ServiceItem(nodeID, service.name, service.version, service.settings);
			this.services.push(item);
		}
	}

	/**
	 * Unregister local service
	 *
	 * @param {String?} nodeID
	 * @param {String} serviceName
	 *
	 * @memberof ServiceRegistry
	 */
	unregisterService(nodeID, serviceName) {
		this.services.forEach(svc => {
			if (svc.nodeID != nodeID || svc.name != serviceName) return;
			// Remove actions of node
			_.forIn(svc.actions, action => {
				this.unregisterAction(nodeID, action);
			});
		});

		_.remove(this.services, svc => svc.nodeID == nodeID && svc.name == serviceName);
	}

	/**
	 * Unregister services by nodeID. It will be called when a node disconnected
	 *
	 * @param {String?} nodeID
	 *
	 * @memberof ServiceRegistry
	 */
	unregisterServicesByNode(nodeID) {
		this.services.forEach(svc => {
			if (svc.nodeID != nodeID) return;
			// Remove remote actions of node
			_.forIn(svc.actions, action => {
				this.unregisterAction(nodeID, action);
			});
		});

		_.remove(this.services, svc => svc.nodeID == nodeID);
	}

	/**
	 * Find a service by name & version
	 *
	 * @param {String} name
	 * @param {String|Number} version
	 * @returns {ServiceItem} Service
	 *
	 * @memberof ServiceRegistry
	 */
	findService(name, version) {
		return this.services.find(svc => svc.isSame(name, version));
	}

	/**
	 * Find a service by name & version
	 *
	 * @param {String} nodeID
	 * @param {String} name
	 * @param {String|Number} version
	 * @returns {ServiceItem} Service
	 *
	 * @memberof ServiceRegistry
	 */
	findServiceByNode(nodeID, name, version) {
		return this.services.find(svc => svc.isSame(name, version) && svc.nodeID == nodeID);
	}

	/**
	 * Register an action
	 *
	 * @param {String?} nodeID		NodeID if it is on a remote server/node
	 * @param {Object} 	action		Action schema
	 *
	 * @memberOf ServiceRegistry
	 */
	registerAction(nodeID, action) {
		// Append action by name
		let list = this.actions.get(action.name);
		if (!list) {
			// Create a new endpoint list for action
			list = new EndpointList(this.broker, this.opts);
			list.internal = action.name.startsWith("$");
			this.actions.set(action.name, list);
		}

		const svc = this.findServiceByNode(nodeID, action.service.name, action.service.version);
		if (svc) {
			svc.addAction(action);
		}

		return list.add(nodeID, action);
	}

	/**
	 * Unregister an action. It will be called when a remote node disconnected.
	 *
	 * @param {String?} nodeID		NodeID if it is on a remote server/node
	 * @param {Object} 	action		action schema
	 *
	 * @memberOf ServiceRegistry
	 */
	unregisterAction(nodeID, action) {
		let list = this.actions.get(action.name);
		if (list) {
			list.removeByNode(nodeID);
		}
	}

	/**
	 * Find action item by name
	 *
	 * @param {String} actionName
	 * @returns {EndpointList}
	 *
	 * @memberOf ServiceRegistry
	 */
	findAction(actionName) {
		let item = this.actions.get(actionName);
		return item;
	}

	/**
	 * Get endpoint by nodeID
	 *
	 * @param {any} actionName
	 * @param {any} nodeID
	 * @returns
	 *
	 * @memberof ServiceRegistry
	 */
	getEndpointByNodeID(actionName, nodeID) {
		let item = this.findAction(actionName);
		if (item) {
			return item.getEndpointByNodeID(nodeID);
		}
	}

	/**
	 * Has an action by name
	 *
	 * @param {any} actionName
	 * @returns
	 *
	 * @memberOf ServiceRegistry
	 */
	hasAction(actionName) {
		return this.actions.has(actionName);
	}

	/**
	 * Get count of actions
	 *
	 * @returns {Number} Number of actions
	 *
	 * @memberof ServiceRegistry
	 */
	actionCount() {
		return this.actions.size;
	}

	/**
	 * Get a filtered list of services with actions
	 *
	 * @param {any} {onlyLocal = false, skipInternal = false, withEndpoints = false}
	 * @returns {Array}
	 *
	 * @memberOf ServiceRegistry
	 */
	getServiceList({ onlyLocal = false, skipInternal = false, withActions = false }) {
		let res = [];
		this.services.forEach(service => {
			if (skipInternal && /^\$node/.test(service.name))
				return;

			if (onlyLocal && !service.local)
				return;

			let item = {
				name: service.name,
				version: service.version,
				settings: service.settings,
				nodeID: service.nodeID
			};

			if (withActions) {
				item.actions = {};

				_.forIn(service.actions, action => {
					if (action.protected) return;

					item.actions[action.name] = _.omit(action, ["handler", "service"]);
				});
			}

			res.push(item);
		});
		return res;
	}

	/**
	 * Get a filtered list of actions
	 *
	 * @param {any} {onlyLocal = false, skipInternal = false, withEndpoints = false}
	 * @returns
	 *
	 * @memberof ServiceRegistry
	 */
	getActionList({onlyLocal = false, skipInternal = false, withEndpoints = false}) {
		let res = [];

		this.actions.forEach((entry, key) => {
			if (skipInternal && /^\$node/.test(key))
				return;

			if (onlyLocal && !entry.hasLocal())
				return;

			let item = {
				name: key,
				count: entry.count(),
				hasLocal: entry.hasLocal(),
				available: entry.hasAvailable()
			};

			if (item.count > 0) {
				const ep = entry.list[0];
				item.action = _.omit(ep.action, ["handler", "service"]);
			}

			if (withEndpoints) {
				if (item.count > 0) {
					item.endpoints = entry.list.map(endpoint => {
						return {
							nodeID: endpoint.nodeID,
							state: endpoint.state
						};
					});
				}
			}

			res.push(item);
		});

		return res;
	}
}

class ServiceItem {
	constructor(nodeID, name, version, settings) {
		this.nodeID = nodeID;
		this.name = name;
		this.version = version;
		this.settings = settings;
		this.local = this.nodeID == LOCAL_NODE_ID;
		this.actions = {};
	}

	addAction(action) {
		this.actions[action.name] = action;
	}

	isSame(name, version) {
		return this.name == name && this.version == version;
	}
}

class Endpoint {
	constructor(broker, nodeID, action) {
		this.broker = broker;
		this.nodeID = nodeID;
		this.action = action;
		this.local = this.nodeID == LOCAL_NODE_ID;

		this.state = CIRCUIT_CLOSE;
		this.failures = 0;

		this.cbTimer = null;
	}

	updateAction(action) {
		this.action = action;
	}

	available() {
		return this.state === CIRCUIT_CLOSE || this.state === CIRCUIT_HALF_OPEN;
	}

	failure() {
		this.failures++;
		if (this.failures >= this.broker.options.circuitBreaker.maxFailures) {
			this.circuitOpen();
		}
	}

	circuitOpen() {
		this.state = CIRCUIT_OPEN;
		this.cbTimer = setTimeout(() => {
			this.circuitHalfOpen();
		}, this.broker.options.circuitBreaker.halfOpenTime);

		this.cbTimer.unref();

		this.broker.emitLocal("circuit-breaker.open", { nodeID: this.nodeID, action: this.action, failures: this.failures });
	}

	circuitHalfOpen() {
		this.state = CIRCUIT_HALF_OPEN;

		this.broker.emitLocal("circuit-breaker.half-open", { nodeID: this.nodeID, action: this.action });
	}

	circuitClose() {
		this.state = CIRCUIT_CLOSE;
		this.failures = 0;
		this.broker.emitLocal("circuit-breaker.close", { nodeID: this.nodeID, action: this.action });

	}
}

class EndpointList {

	/**
	 * Creates an instance of EndpointList.
	 *
	 * @param {ServiceBroker} broker
	 * @param {Object} opts
	 * 		opts.strategy - type of balancing (defaults: new RoundRobinStrategy())
	 * 		opts.preferLocal - call a local service if available (defaults: true)
	 *
	 * @memberOf EndpointList
	 */
	constructor(broker, opts) {
		this.broker = broker;
		this.opts = _.defaultsDeep({}, opts, {
			strategy: new RoundRobinStrategy(),
			preferLocal: true
		});

		this.list = [];
		this.localEndpoint = null;
	}

	add(nodeID, action) {
		let found = this.list.find(item => item.nodeID == nodeID);
		if (found) {
			found.updateAction(action);
			return false;
		}

		const item = new Endpoint(this.broker, nodeID, action);
		if (item.local)
			this.localEndpoint = item;

		this.list.push(item);

		return true;
	}

	get() {
		const ret = this.getStrategy().select(this.list);
		if (!ret) {
			throw new Error(`Strategy ${typeof(this.getStrategy())} returned an invalid endpoint.`);
		}
		return ret;
	}

	nextAvailable() {
		// No items
		if (this.list.length === 0) {
			return null;
		}

		// If internal, return the local always
		if (this.internal) {
			return this.localEndpoint;
		}

		// Only 1 item
		if (this.list.length === 1) {
			// No need to select a node, return the only one
			const item = this.list[0];
			if (item.available())
				return item;

			return null;
		}

		// Search local item
		if (this.opts.preferLocal === true && this.localEndpoint && this.localEndpoint.available()) {
			return this.localEndpoint;
		}

		const max = this.list.length;
		let i = 0;
		while (i < max) {
			const item = this.get();
			if (item.available())
				return item;

			i++;
		}

		return null;
	}

	getAction() {
		const item = this.nextAvailable();
		return item != null ? item.action : null;
	}

	getEndpointByNodeID(nodeID) {
		const item = this.list.find(item => item.nodeID == nodeID);
		if (item && item.available())
			return item;
	}

	count() {
		return this.list.length;
	}

	getLocalEndpoint() {
		return this.localEndpoint;
	}

	getStrategy() {
		return this.opts.strategy;
	}

	hasLocal() {
		return this.localEndpoint != null;
	}

	hasAvailable() {
		return this.list.find(endpoint => endpoint.available()) != null;
	}

	removeByAction(action) {
		_.remove(this.list, (el) => el.action == action);
	}

	removeByNode(nodeID) {
		_.remove(this.list, item => item.nodeID == nodeID);
		if (nodeID == null)
			this.localEndpoint = null;
	}
}

ServiceRegistry.EndpointList = EndpointList;
ServiceRegistry.Endpoint = Endpoint;
ServiceRegistry.ServiceItem = ServiceItem;

module.exports = ServiceRegistry;
