/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const { remove, random, defaultsDeep, omit } = require("lodash");

// Registry strategies
const STRATEGY_ROUND_ROBIN = 1;
const STRATEGY_RANDOM = 2;

// Circuit-breaker states
const CIRCUIT_CLOSE 	= "close";
const CIRCUIT_HALF_OPEN = "half_open";
const CIRCUIT_OPEN 		= "open";

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
			item = new ActionList(this.broker, this.opts);
			this.actions.set(action.name, item);
		}

		const res = item.add(nodeID, action);
		if (res) {
			this.broker.emitLocal(`register.action.${action.name}`, { nodeID, action });
		}

		return res;
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
	getLocalActionList() {
		let res = {};
		this.actions.forEach((entry, key) => {
			let item = entry.getLocalItem();
			if (item && !/^\$node/.test(key)) // Skip internal actions
				res[key] = omit(item.data, ["handler", "service"]);
		});
		return res;
	}	
}

class ActionItem {
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

class ActionList {

	/**
	 * Creates an instance of ActionList.
	 * 
	 * @param {ServiceBroker} broker
	 * @param {any} opts
	 * 		opts.strategy - type of balancing (STRATEGY_ROUND_ROBIN, STRATEGY_RANDOM) (defaults: STRATEGY_ROUND_ROBIN)
	 * 		opts.preferLocal - call a local service if available (defaults: true)
	 * 
	 * @memberOf ActionList
	 */
	constructor(broker, opts) {
		this.broker = broker;
		this.opts = defaultsDeep({}, opts, {
			strategy: STRATEGY_ROUND_ROBIN,
			preferLocal: true
		});

		this.list = [];
		this.counter = 0;
		this.localItem = null;
	}

	add(nodeID, action) {
		if (nodeID != null) {
			let found = this.list.find(item => item.nodeID == nodeID);
			if (found) {
				found.updateAction(action);
				return false;
			}
		}

		const item = new ActionItem(this.broker, nodeID, action);
		if (item.local)
			this.localItem = item;

		this.list.push(item);
		
		return true;
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
		if (this.opts.preferLocal === true && this.localItem && this.localItem.available()) {
			return this.localItem;
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

	getAction() {
		const item = this.get();
		return item != null ? item.action : null;
	}

	count() {
		return this.list.length;
	}

	getLocalItem() {
		return this.localItem;
	}

	hasLocal() {
		return this.localItem != null;
	}

	remove(data) {
		remove(this.list, (el) => el.data == data);
	}

	removeByNode(nodeID) {
		remove(this.list, item => item.nodeID == nodeID);
	}
}

ServiceRegistry.ActionList = ActionList;
ServiceRegistry.ActionItem = ActionItem;

ServiceRegistry.STRATEGY_ROUND_ROBIN = 1;
ServiceRegistry.STRATEGY_RANDOM = 2;

// Circuit-breaker states
ServiceRegistry.CIRCUIT_CLOSE 		= "close";
ServiceRegistry.CIRCUIT_HALF_OPEN 	= "half_open";
ServiceRegistry.CIRCUIT_OPEN 		= "open";

module.exports = ServiceRegistry;