/*
 * moleculer
 * Copyright (c) 2017 Icebob (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const remove = require("lodash/remove");

class BalancedList {

	/**
	 * Creates an instance of BalancedList.
	 * 
	 * @param {any} opts
	 * 		opts.model - type of balancing (round-robin, random) (defaults: round-robin)
	 * 		opts.preferLocal - call a local service if available (defaults: true)
	 * 
	 * @memberOf BalancedList
	 */
	constructor(opts) {
		this.opts = opts || {
			preferLocale: true
		};
		this.list = [];
		this.counter = 0;
	}

	add(data, weight = 0, nodeID) {
		if (nodeID != null) {
			let found = this.list.find(item => item.nodeID == nodeID);
			if (found) {
				found.data = data;
				return false;
			}
		}
		this.list.push({
			data,
			weight,
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

		if (this.counter >= this.list.length) {
			this.counter = 0;
		}

		
		if (this.opts.preferLocale) {
			let item = this.getLocalItem();
			if (item) {
				return item;
			}
		}
		// TODO: implement load-balance modes

		return this.list[this.counter++];
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

module.exports = BalancedList;