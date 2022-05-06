/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const utils = require("../utils");
const Strategies = require("../strategies");
const EndpointList = require("./endpoint-list");
const EventEndpoint = require("./endpoint-event");

/**
 * Catalog for events
 *
 * @class EventCatalog
 */
class EventCatalog {
	/**
	 * Creates an instance of EventCatalog.
	 *
	 * @param {Registry} registry
	 * @param {ServiceBroker} broker
	 * @param {any} StrategyFactory
	 * @memberof EventCatalog
	 */
	constructor(registry, broker, StrategyFactory) {
		this.registry = registry;
		this.broker = broker;
		this.logger = registry.logger;
		this.StrategyFactory = StrategyFactory;

		this.events = [];

		this.EndpointFactory = EventEndpoint;
	}

	/**
	 * Add a new event
	 *
	 * @param {Node} node
	 * @param {ServiceItem} service
	 * @param {any} event
	 * @returns
	 * @memberof EventCatalog
	 */
	add(node, service, event) {
		const eventName = event.name;
		const groupName = event.group || service.name;
		let list = this.get(eventName, groupName);
		if (!list) {
			const strategyFactory = event.strategy
				? Strategies.resolve(event.strategy) || this.StrategyFactory
				: this.StrategyFactory;
			const strategyOptions = event.strategyOptions
				? event.strategyOptions
				: this.registry.opts.strategyOptions;
			// Create a new EndpointList
			list = new EndpointList(
				this.registry,
				this.broker,
				eventName,
				groupName,
				this.EndpointFactory,
				strategyFactory,
				strategyOptions
			);
			this.events.push(list);
		}

		list.add(node, service, event);

		return list;
	}

	/**
	 * Get an event by name (and group name)
	 *
	 * @param {String} eventName
	 * @param {String} groupName
	 * @returns
	 * @memberof EventCatalog
	 */
	get(eventName, groupName) {
		return this.events.find(list => list.name == eventName && list.group == groupName);
	}

	/**
	 * Get balanced endpoint for event
	 *
	 * @param {String} eventName
	 * @param {String|Array?} groups
	 * @returns
	 * @memberof EventCatalog
	 */
	async getBalancedEndpoints(eventName, groups) {
		const eventGroup = [];

		return Promise.all(
			this.events
				.filter(
					list =>
						utils.match(eventName, list.name) &&
						(groups == null || groups.length === 0 || groups.indexOf(list.group) !== -1)
				)
				.map(list => {
					eventGroup.push(list.group);
					// Use built-in balancer, get the next endpoint
					return list.next();
				})
		).then(res =>
			res
				.map((ep, i) => [ep, eventGroup[i]])
				.filter(([ep]) => ep && ep.isAvailable)
				.map(([ep, group]) => [ep, group])
		);
	}

	/**
	 * Get all groups for event
	 *
	 * @param {String} eventName
	 * @returns Array<String>
	 * @memberof EventCatalog
	 */
	getGroups(eventName) {
		return _.uniq(
			this.events.filter(list => utils.match(eventName, list.name)).map(item => item.group)
		);
	}

	/**
	 * Get all endpoints for event
	 *
	 * @param {String} eventName
	 * @param {Array<String>?} groupNames
	 * @returns
	 * @memberof EventCatalog
	 */
	getAllEndpoints(eventName, groupNames) {
		const res = [];
		this.events.forEach(list => {
			if (!utils.match(eventName, list.name)) return;
			if (
				groupNames == null ||
				groupNames.length == 0 ||
				groupNames.indexOf(list.group) !== -1
			) {
				list.endpoints.forEach(ep => {
					if (ep.isAvailable) res.push(ep);
				});
			}
		});

		return _.uniqBy(res, "id");
	}

	/**
	 * Call local service handlers
	 *
	 * @param {String} eventName
	 * @param {any} payload
	 * @param {Array<String>?} groupNames
	 * @param {String} nodeID
	 * @param {boolean} broadcast
	 * @returns {Promise<any>}
	 *
	 * @memberof EventCatalog
	 */
	emitLocalServices(ctx) {
		const isBroadcast = ["broadcast", "broadcastLocal"].indexOf(ctx.eventType) !== -1;
		const sender = ctx.nodeID;
		let promises;

		const filteredEvents = this.events.filter(
			list =>
				utils.match(ctx.eventName, list.name) &&
				(ctx.eventGroups == null ||
					ctx.eventGroups.length === 0 ||
					ctx.eventGroups.indexOf(list.group) !== -1)
		);

		if (isBroadcast) {
			promises = _.flatMap(filteredEvents, list => {
				return list.endpoints.map(ep => {
					if (ep.local && ep.event.handler) {
						const newCtx = ctx.copy(ep);
						newCtx.nodeID = sender;
						return this.callEventHandler(newCtx);
					}
				});
			});
		} else {
			promises = filteredEvents.map(list =>
				list.nextLocal(ctx).then(ep => {
					if (ep && ep.event.handler) {
						const newCtx = ctx.copy(ep);
						newCtx.nodeID = sender;
						return this.callEventHandler(newCtx);
					}
				})
			);
		}

		return this.broker.Promise.all(promises);
	}

	/**
	 * Call local event handler and handles unhandled promise rejections.
	 *
	 * @param {Context} ctx
	 *
	 * @memberof EventCatalog
	 */
	callEventHandler(ctx) {
		return ctx.endpoint.event.handler(ctx);
	}

	/**
	 * Remove endpoints by service
	 *
	 * @param {ServiceItem} service
	 * @memberof EventCatalog
	 */
	removeByService(service) {
		this.events.forEach(list => {
			list.removeByService(service);
		});
	}

	/**
	 * Remove endpoint by name & nodeId
	 *
	 * @param {String} eventName
	 * @param {String} nodeID
	 * @memberof EventCatalog
	 */
	remove(eventName, nodeID) {
		this.events.forEach(list => {
			if (list.name == eventName) list.removeByNodeID(nodeID);
		});
	}

	/**
	 * Get a filtered list of events
	 *
	 * @param {Object} {onlyLocal = false, onlyAvailable = false, skipInternal = false, withEndpoints = false}
	 * @returns {Array}
	 *
	 * @memberof EventCatalog
	 */
	list({
		onlyLocal = false,
		onlyAvailable = false,
		skipInternal = false,
		withEndpoints = false
	}) {
		let res = [];

		this.events.forEach(list => {
			/* istanbul ignore next */
			if (skipInternal && /^\$/.test(list.name)) return;

			if (onlyLocal && !list.hasLocal()) return;

			if (onlyAvailable && !list.hasAvailable()) return;

			let item = {
				name: list.name,
				group: list.group,
				count: list.count(),
				//service: list.service,
				hasLocal: list.hasLocal(),
				available: list.hasAvailable()
			};

			if (item.count > 0) {
				const ep = list.endpoints[0];
				if (ep) item.event = _.omit(ep.event, ["handler", "remoteHandler", "service"]);
			}

			if (withEndpoints) {
				if (item.count > 0) {
					item.endpoints = list.endpoints.map(ep => {
						return {
							nodeID: ep.node.id,
							state: ep.state,
							available: ep.node.available
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
