/*
 * moleculer
 * Copyright (c) 2017 Icebob (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const remove = require("lodash/remove");
const random = require("lodash/random");
const defaultsDeep = require("lodash/defaultsDeep");

const STRATEGY_ROUND_ROBIN = 1;
const STRATEGY_RANDOM = 2;

class BalancedList {

	/**
	 * Creates an instance of BalancedList.
	 * 
	 * @param {any} opts
	 * 		opts.strategy - type of balancing (STRATEGY_ROUND_ROBIN, STRATEGY_RANDOM) (defaults: STRATEGY_ROUND_ROBIN)
	 * 		opts.preferLocal - call a local service if available (defaults: true)
	 * 
	 * @memberOf BalancedList
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
		if (this.list.length == 0) {
			return null;
		}

		if (this.list.length == 1) {
			// No need to select a node, return the only one
			return this.list[0];
		}

		// Reset counter
		if (this.counter >= this.list.length) {
			this.counter = 0;
		}

		// Search local item
		if (this.opts.preferLocal) {
			let item = this.getLocalItem();
			if (item) {
				return item;
			}
		}

		if (this.strategy == STRATEGY_RANDOM) {
			/* istanbul ignore next */
			return this.list[random(0, this.list.length - 1)];
		} else {
			// Round-robin
			return this.list[this.counter++];
		}
	}

	getData() {
		const item = this.get();
		return item ? item.data : null;
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

BalancedList.STRATEGY_ROUND_ROBIN = 1;
BalancedList.STRATEGY_RANDOM = 2;

module.exports = BalancedList;