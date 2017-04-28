/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const { remove, random, defaultsDeep, omit } = require("lodash");

const STRATEGY_ROUND_ROBIN = 1;
const STRATEGY_RANDOM = 2;

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
		this.opts = defaultsDeep(opts, {
			strategy: STRATEGY_ROUND_ROBIN,
			preferLocal: true
		});
		this.actions = new Map();
	}

	/**
	 * Register an action in a local server
	 * 
	 * @param {String?} nodeID		NodeID if it is on a remote server/node
	 * @param {Object} 	action		Action schema
	 * 
	 * @memberOf ServiceRegistry
	 */
	registerAction(nodeID, action) {
		// Append action by name
		let item = this.actions.get(action.name);
		if (!item) {
			item = new ActionList(this.opts);
			this.actions.set(action.name, item);
		}

		return item.add(action, nodeID);
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

class ActionList {

	/**
	 * Creates an instance of ActionList.
	 * 
	 * @param {any} opts
	 * 		opts.strategy - type of balancing (STRATEGY_ROUND_ROBIN, STRATEGY_RANDOM) (defaults: STRATEGY_ROUND_ROBIN)
	 * 		opts.preferLocal - call a local service if available (defaults: true)
	 * 
	 * @memberOf ActionList
	 */
	constructor(opts) {
		this.opts = defaultsDeep(opts, {
			strategy: STRATEGY_ROUND_ROBIN,
			preferLocal: true
		});
		this.list = [];
		this.counter = 0;

		this.strategy = this.opts.strategy;
	}

	add(data, nodeID) {
		if (nodeID != null) {
			let found = this.list.find(item => item.nodeID == nodeID);
			if (found) {
				found.data = data;
				return false;
			}
		}
		this.list.push({
			data,
			local: nodeID == null,
			nodeID
		});
		
		return true;
	}

	get() {
		if (this.list.length === 0) {
			return null;
		}

		if (this.list.length === 1) {
			// No need to select a node, return the only one
			return this.list[0];
		}

		// Reset counter
		if (this.counter >= this.list.length) {
			this.counter = 0;
		}

		// Search local item
		if (this.opts.preferLocal === true) {
			let item = this.getLocalItem();
			if (item != null) {
				return item;
			}
		}

		if (this.strategy === STRATEGY_RANDOM) {
			/* istanbul ignore next */
			return this.list[random(0, this.list.length - 1)];
		} else {
			// Round-robin
			return this.list[this.counter++];
		}
	}

	getData() {
		const item = this.get();
		return item != null ? item.data : null;
	}

	count() {
		return this.list.length;
	}

	getLocalItem() {
		return this.list.find(item => item.local);
	}

	hasLocal() {
		return this.getLocalItem() != null;
	}

	remove(data) {
		remove(this.list, (el) => el.data == data);
	}

	removeByNode(nodeID) {
		remove(this.list, item => item.nodeID == nodeID);
	}
}

ServiceRegistry.ActionList = ActionList;

ServiceRegistry.STRATEGY_ROUND_ROBIN = 1;
ServiceRegistry.STRATEGY_RANDOM = 2;

module.exports = ServiceRegistry;