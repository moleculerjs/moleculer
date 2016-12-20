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
		this.opts = opts || {};
		this.list = [];
		this.counter = 0;
	}

	add(data, weight = 0, local = true) {
		this.list.push({
			data,
			weight,
			local
		});
	}

	get() {
		if (this.list.length == 0) return null;

		if (this.counter >= this.list.length)
			this.counter = 0;

		// TODO: implement load-balance modes

		let item = this.list[this.counter++];
		if (item)
			return item.data;
	}

	hasLocal() {
		return _.find(this.list, (el) => el.local === true) != null;
	}

	remove(data) {
		_.remove(this.list, (el) => el.data == data);
	}

}

module.exports = BalancedList;