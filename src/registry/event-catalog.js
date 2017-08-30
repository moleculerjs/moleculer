/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
//const BaseCatalog = require("./base-catalog");
const EventGroupCatalog = require("./eventgroup-catalog");
const EventEndpoint = require("./endpoint-event");

class EventCatalog {

	constructor(registry, broker, logger, strategy) {
		this.registry = registry;
		this.broker = broker;
		this.logger = logger;
		this.strategy = strategy;

		this.events = new Map();

		this.EndpointFactory = EventEndpoint;
	}

	add(node, service, event) {
		const name = event.name;
		let list = this.events.get(name);
		if (!list) {
			// Create a new Event group
			list = new EventGroupCatalog(this.registry, this.broker, this.logger, this.strategy);
			this.events.set(name, list);
		}

		list.add(node, service, event);
	}
/*
	has(name, version, nodeID) {
		return this.events.find(svc => svc.equals(name, version, nodeID)) != null;
	}
*/
	get(eventName) {
		return this.events.get(eventName);
	}

	removeByService(service) {
		this.events.forEach(group => {
			group.removeByService(service);
		});
	}

	remove(eventName, nodeID) {
		const group = this.events.get(eventName);
		if (group)
			group.removeByNodeID(nodeID);
	}

	/**
	 * Get a filtered list of events
	 *
	 * @param {Object} {onlyLocal = false, skipInternal = false, withEndpoints = false}
	 * @returns {Array}
	 *
	 * @memberof EventCatalog
	 */
	list({onlyLocal = false, skipInternal = false, withEndpoints = false}) {
		let res = [];
		// TODO
		this.events.forEach((group, eventName) => {
			group.groups.forEach((list, groupName) => {
				if (skipInternal && /^\$/.test(eventName))
					return;

				if (onlyLocal && !list.hasLocal())
					return;

				let item = {
					name: eventName,
					group: groupName,
					count: list.count(),
					hasLocal: list.hasLocal(),
					available: list.hasAvailable()
				};

				if (item.count > 0) {
					const ep = list.endpoints[0];
					if (ep)
						item.event = _.omit(ep.event, ["handler", "service"]);
				}

				if (withEndpoints) {
					if (item.count > 0) {
						item.endpoints = list.endpoints.map(ep => {
							return {
								nodeID: ep.node.id,
								state: ep.state
							};
						});
					}
				}

				res.push(item);
			});
		});

		return res;
	}
}

module.exports = EventCatalog;
