/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const nanomatch  	= require("nanomatch");
const EndpointList = require("./endpoint-list");
const EventEndpoint = require("./endpoint-event");

class EventCatalog {

	constructor(registry, broker, StrategyFactory) {
		this.registry = registry;
		this.broker = broker;
		this.logger = registry.logger;
		this.StrategyFactory = StrategyFactory;

		this.events = [];

		this.EndpointFactory = EventEndpoint;
	}

	add(node, service, event) {
		const eventName = event.name;
		const groupName = event.group || service.name;
		let list = this.get(eventName, groupName);
		if (!list) {
			// Create a new EndpointList
			list = new EndpointList(this.registry, this.broker, eventName, groupName, this.EndpointFactory, new this.StrategyFactory());
			this.events.push(list);
		}

		list.add(node, service, event);
	}

	get(eventName, groupName) {
		return this.events.find(list => list.name == eventName && list.group == groupName);
	}

	getBalancedEndpoints(eventName, groupName) {
		const res = [];

		this.events.forEach(list => {
			if (!nanomatch.isMatch(eventName, list.name)) return;
			if (groupName == null || groupName == list.group) {
				const ep = list.next();
				if (ep && ep.isAvailable)
					res.push([ep, list.group]);
			}
		});

		return res;
	}

	getAllEndpoints(eventName) {
		const res = [];
		this.events.forEach(list => {
			if (!nanomatch.isMatch(eventName, list.name)) return;
			list.endpoints.forEach(ep => {
				if (ep.isAvailable)
					res.push(ep);
			});
		});

		return _.uniqBy(res, "id");
	}

	emitLocalServices(eventName, payload, groupNames, nodeID) {
		this.events.forEach(list => {
			if (!nanomatch.isMatch(eventName, list.name)) return;
			if (groupNames == null || groupNames.length == 0 || groupNames.indexOf(list.group) !== -1) {
				list.endpoints.forEach(ep => {
					if (ep.local && ep.event.handler)
						ep.event.handler(payload, nodeID, eventName);
				});
			}
		});
	}

	removeByService(service) {
		this.events.forEach(list => {
			list.removeByService(service);
		});
	}

	remove(eventName, nodeID) {
		this.events.forEach(list => {
			if (list.name == eventName)
				list.removeByNodeID(nodeID);
		});
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

		this.events.forEach(list => {
			if (skipInternal && /^\$/.test(list.name))
				return;

			if (onlyLocal && !list.hasLocal())
				return;

			let item = {
				name: list.name,
				group: list.group,
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

		return res;
	}
}

module.exports = EventCatalog;
