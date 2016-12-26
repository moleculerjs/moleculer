"use strict";

let _ = require("lodash");

class BalancedList {

	/**
	 * Creates an instance of BalancedList.
	 * 
	 * @param {any} opts
	 * 		opts.model - type of balancing (round-robin, weighted) (defaults: round-robin)
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
			let found = _.find(this.list, item => item.nodeID == nodeID);
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

		if (this.counter >= this.list.length) {
			this.counter = 0;
		}

		let item;
		if (this.opts.preferLocale) {
			item = this.getLocalItem();
			if (item) {
				return item;
			}
		}
		// TODO: implement load-balance modes

		item = this.list[this.counter++];
		return item;
	}

	count() {
		return this.list.length;
	}

	getLocalItem() {
		return _.find(this.list, (el) => el.local === true);
	}

	hasLocal() {
		return this.getLocalItem() != null;
	}

	remove(data) {
		_.remove(this.list, (el) => el.data == data);
		this.counter = 0;
	}

	removeByNode(nodeID) {
		_.remove(this.list, item => item.nodeID == nodeID);
		this.counter = 0;
	}
}

module.exports = BalancedList;