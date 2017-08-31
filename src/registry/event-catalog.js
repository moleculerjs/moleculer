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

	constructor(registry, broker, logger, StrategyFactory) {
		this.registry = registry;
		this.broker = broker;
		this.logger = logger;
		this.StrategyFactory = StrategyFactory;

		this.events = new Map();

		this.EndpointFactory = EventEndpoint;
	}

	add(node, service, event) {
		const name = event.name;
		let groups = this.events.get(name);
		if (!groups) {
			// Create a new Event groups
			groups = new EventGroupCatalog(this.registry, this.broker, this.logger, this.StrategyFactory);
			this.events.set(name, groups);
		}

		groups.add(node, service, event);
	}

	get(eventName) {
		return this.events.get(eventName);
	}

	getBalancedEndpoints(eventName, groupName) {
		const res = [];
		// TODO handle wildcards
		const groups = this.events.get(eventName);
		if (groups) {
			groups.groups.forEach((list, gName) => {
				if (groupName == null || groupName == gName) {
					const ep = list.next();
					if (ep)
						res.push([ep, gName]);
					else
						this.logger.warn(`There is no available '${groupName}' service to handle the 'eventName' event!`);
				}
			});
		}

		return res;
	}

	getAllEndpoints(eventName) {
		const res = [];
		// TODO handle wildcards
		const groups = this.events.get(eventName);
		if (groups) {
			groups.groups.forEach((list) => {
				list.endpoints.forEach(ep => {
					if (ep.isAvailable)
						res.push(ep);
				});
			});
		}

		return _.uniqBy(res, "id");
	}

	emitLocalServices(eventName, payload, groupName, nodeID) {
		// TODO handle wildcards
		const groups = this.events.get(eventName);
		if (groups) {
			groups.groups.forEach((list, gName) => {
				if (groupName == null || groupName == gName) {
					list.endpoints.forEach(ep => {
						if (ep.local && ep.event.handler)
							ep.event.handler(payload, nodeID, eventName);
					});
				}
			});
		}
	}

	removeByService(service) {
		this.events.forEach(groups => {
			groups.removeByService(service);
		});
	}

	remove(eventName, nodeID) {
		const groups = this.events.get(eventName);
		if (groups)
			groups.removeByNodeID(nodeID);
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
		this.events.forEach((groups, eventName) => {
			groups.groups.forEach((list, groupName) => {
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
