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

	add(data, weight = 0) {
		this.list.push({
			data,
			weight
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

	remove(data) {
		_.remove(this.list, (el) => el.data == data);
	}

}

module.exports = BalancedList;