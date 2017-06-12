/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");

// Registry strategies
const { STRATEGY_ROUND_ROBIN, STRATEGY_RANDOM } = require("./constants");

// Circuit-breaker states
const { CIRCUIT_CLOSE, CIRCUIT_HALF_OPEN, CIRCUIT_OPEN } = require("./constants");

class ServiceRegistry {
	/**
	 * Creates an instance of ServiceRegistry.
	 * 
	 * @param {any} opts
	 * 		opts.strategy - type of balancing (STRATEGY_ROUND_ROBIN, STRATEGY_RANDOM) (defaults: STRATEGY_ROUND_ROBIN)
	 * 		opts.preferLocal - call the local service if available (defaults: true)
	 * 
	 * @memberOf ServiceRegistry
	 */
	constructor(opts) {
		this.opts = _.defaultsDeep({}, opts, {
			strategy: STRATEGY_ROUND_ROBIN,
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
	 * Unregister services by nodeID. It will be called when a node disconnected
	 * 
	 * @param {String} nodeID 
	 * 
	 * @memberof ServiceRegistry
	 */
	unregisterServicesByNode(nodeID) {
		this.services.forEach(svc => {
			if (svc.nodeID !=  nodeID) return;
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
	 * @param {any} name 
	 * @param {any} version 
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
	 * @param {any} version 
	 * @returns {ServiceItem} Service
	 * 
	 * @memberof ServiceRegistry
	 */
	findServiceByNode(nodeID, name, version) {
		return this.services.find(svc => svc.name == name && svc.version == version && svc.nodeID == nodeID);
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
			list = new EndpointList(this.broker, this.opts);
			list.internal = action.name.startsWith("$");
			this.actions.set(action.name, list);
		}

		const svc = this.findServiceByNode(nodeID, action.service.name, action.service.version);
		if (svc)
			svc.addAction(action);

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
			/* Don't delete because maybe node is only disconnected and will come back.
			   So the action is exists, just there is not available right now.
			
			if (list.count() == 0) {
				this.actions.delete(action.name);
			}
			this.emitLocal(`unregister.action.${action.name}`, { service, action, nodeID });
			*/
		}		
	}

	/**
	 * Find action item by name
	 * 
	 * @param {String} actionName 
	 * @returns 
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
	 * @returns 
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
		this.local = this.nodeID == null;
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
		this.local = this.nodeID == null;

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
	 * @param {any} opts
	 * 		opts.strategy - type of balancing (STRATEGY_ROUND_ROBIN, STRATEGY_RANDOM) (defaults: STRATEGY_ROUND_ROBIN)
	 * 		opts.preferLocal - call a local service if available (defaults: true)
	 * 
	 * @memberOf EndpointList
	 */
	constructor(broker, opts) {
		this.broker = broker;
		this.opts = _.defaultsDeep({}, opts, {
			strategy: STRATEGY_ROUND_ROBIN,
			preferLocal: true
		});

		this.list = [];
		this.counter = 0;
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
		if (this.opts.strategy === STRATEGY_RANDOM) {
			/* istanbul ignore next */
			return this.list[_.random(0, this.list.length - 1)];
		} else {
			// Round-robin

			// Reset counter
			if (this.counter >= this.list.length) {
				this.counter = 0;
			}

			return this.list[this.counter++];
		}
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