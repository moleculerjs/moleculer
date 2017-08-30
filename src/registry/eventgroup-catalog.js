/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const EndpointList = require("./endpoint-list");
const EventEndpoint = require("./endpoint-event");

class EventGroupCatalog {

	constructor(registry, broker, logger, strategy) {
		this.registry = registry;
		this.broker = broker;
		this.logger = logger;
		this.strategy = strategy;

		this.groups = new Map();

		this.EndpointFactory = EventEndpoint;
	}

	add(node, service, event) {
		const name = event.group || service.name;
		let list = this.groups.get(name);
		if (!list) {
			// Create a new EndpointList
			list = new EndpointList(this.registry, this.broker, this.logger, name, this.EndpointFactory, this.strategy);
			this.groups.set(name, list);
		}

		list.add(node, service, event);
	}
/*
	has(name, version, nodeID) {
		return this.groups.find(svc => svc.equals(name, version, nodeID)) != null;
	}
*/
	get(groupName) {
		return this.groups.get(groupName);
	}

	removeByService(service) {
		this.groups.forEach(list => {
			list.removeByService(service);
		});
	}

	removeByNodeID(nodeID) {
		this.groups.forEach(list => {
			list.removeByNodeID(nodeID);
		});
	}

}

module.exports = EventGroupCatalog;
