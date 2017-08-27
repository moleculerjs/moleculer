/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const EndpointList = require("endpoint-list");

class BaseCatalog {

	constructor(broker) {
		this.broker = broker;
		this.items = new Map();
	}

	add(name, endpoint) {
		let list = this.items.get(name);
		if (!list) {
			// Create a new endpoint list for action
			list = new EndpointList(this.broker);
			list.add(endpoint);
			this.items.set(name, list);
		}
	}



}

module.exports = BaseCatalog;
