"use strict";

let _ = require("lodash");

class BalancedList {

	constructor(mode = 0) {
		this.mode = mode;
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