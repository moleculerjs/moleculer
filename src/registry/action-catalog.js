/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
//const BaseCatalog = require("./base-catalog");
const EndpointList = require("endpoint-list");

class ActionCatalog {

	constructor(registry, broker, logger) {
		this.registry = registry;
		this.broker = broker;
		this.logger = logger;

		this.actions = new Map();
	}

	add(nodeID, action) {
		let list = this.actions.get(action.name);
		if (!list) {
			// Create a new EndpointList
			list = new EndpointList(this.registry, this.broker, this.logger, action.name);
			this.actions.set(action.name, list);
		}

		list.add(nodeID, action);
	}
/*
	has(name, version, nodeID) {
		return this.services.find(svc => svc.equals(name, version, nodeID)) != null;
	}

	get(name, version, nodeID) {
		return this.services.find(svc => svc.equals(name, version, nodeID));
	}
*/
}

module.exports = ActionCatalog;
