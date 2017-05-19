/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const { remove, random, defaultsDeep, omit } = require("lodash");

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
	 * 		opts.preferLocal - call a local service if available (defaults: true)
	 * 
	 * @memberOf ServiceRegistry
	 */
	constructor(opts) {
		this.opts = defaultsDeep({}, opts, {
			strategy: STRATEGY_ROUND_ROBIN,
			preferLocal: true
		});
		this.actions = new Map();
	}

	init(broker) {
		this.broker = broker;
	}

	/**
	 * Register an action in a local server
	 * 
	 * @param {String?} nodeID		NodeID if it is on a remote server/node
	 * @param {Object} 	action		Action schema
	 * 
	 * @memberOf ServiceRegistry
	 */
	register(nodeID, action) {
		// Append action by name
		let item = this.actions.get(action.name);
		if (!item) {
			item = new EndpointList(this.broker, this.opts);
			this.actions.set(action.name, item);
		}
		return item.add(nodeID, action);
	}	

	/**
	 * Unregister an action. It will be called when a remote node disconnected. 
	 * 
	 * @param {String?} nodeID		NodeID if it is on a remote server/node
	 * @param {Object} 	action		action schema
	 * 
	 * @memberOf ServiceRegistry
	 */
	deregister(nodeID, action) {
		let item = this.actions.get(action.name);
		if (item) {
			item.removeByNode(nodeID);
			/* Don't delete because maybe node only disconnected and will come back.
			   So the action is exists, just now it is not available.
			
			if (item.count() == 0) {
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
	 * Get a list of names of local actions
	 * 
	 * @returns
	 * 
	 * @memberOf ServiceRegistry
	 */
	getLocalActions() {
		let res = [];
		this.actions.forEach((entry, key) => {
			let endpoint = entry.getLocalEndpoint();
			if (endpoint)
				res.push(omit(endpoint.action, ["handler", "service"]));
		});
		return res;
	}	

	getActionList(onlyLocal = false, skipInternal = false, withEndpoints = false) {
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
				item.action = omit(ep.action, ["handler", "service"]);
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
		this.opts = defaultsDeep({}, opts, {
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
			return this.list[random(0, this.list.length - 1)];
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
		remove(this.list, (el) => el.action == action);
	}

	removeByNode(nodeID) {
		remove(this.list, item => item.nodeID == nodeID);
		if (nodeID == null)
			this.localEndpoint = null;
	}
}

ServiceRegistry.EndpointList = EndpointList;
ServiceRegistry.Endpoint = Endpoint;

module.exports = ServiceRegistry;