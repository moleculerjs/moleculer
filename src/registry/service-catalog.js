/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const ServiceItem = require("./service-item");

/**
 * Catalog for services
 *
 * @class ServiceCatalog
 */
class ServiceCatalog {

	/**
	 * Creates an instance of ServiceCatalog.
	 *
	 * @param {Registry} registry
	 * @param {ServiceBroker} broker
	 * @memberof ServiceCatalog
	 */
	constructor(registry, broker) {
		this.registry = registry;
		this.broker = broker;
		this.logger = registry.logger;

		this.services = [];
	}

	/**
	 * Add a new service
	 *
	 * @param {Node} node
	 * @param {String} name
	 * @param {any} version
	 * @param {Object} settings
	 * @param {Object} metadata
	 *
	 * @returns {ServiceItem}
	 *
	 * @memberof ServiceCatalog
	 */
	add(node, name, version, settings, metadata) {
		const item = new ServiceItem(node, name, version, settings, metadata, node.id == this.broker.nodeID);
		this.services.push(item);
		return item;
	}

	/**
	 * Check the service is exist
	 *
	 * @param {String} name
	 * @param {any} version
	 * @param {String} nodeID
	 * @returns
	 * @memberof ServiceCatalog
	 */
	has(name, version, nodeID) {
		return this.services.find(svc => svc.equals(name, version, nodeID)) != null;
	}

	/**
	 * Get a service by name, version & nodeID
	 *
	 * @param {String} name
	 * @param {any} version
	 * @param {String} nodeID
	 * @returns
	 * @memberof ServiceCatalog
	 */
	get(name, version, nodeID) {
		return this.services.find(svc => svc.equals(name, version, nodeID));
	}

	/**
	 * Get a filtered list of services with actions
	 *
	 * @param {Object} {onlyLocal = false,  onlyAvailable = false, skipInternal = false, withActions = false, withEvents = false}
	 * @returns {Array}
	 *
	 * @memberof Registry
	 */
	list({ onlyLocal = false, onlyAvailable = false, skipInternal = false, withActions = false, withEvents = false }) {
		let res = [];
		this.services.forEach(service => {
			if (skipInternal && /^\$node/.test(service.name))
				return;

			if (onlyLocal && !service.local)
				return;

			if (onlyAvailable && !service.node.available)
				return;

			let item = {
				name: service.name,
				version: service.version,
				settings: service.settings,
				metadata: service.metadata,
				nodeID: service.node.id,
				available: service.node.available,
			};

			if (withActions) {
				item.actions = {};

				_.forIn(service.actions, action => {
					if (action.protected) return;

					item.actions[action.name] = _.omit(action, ["handler", "remoteHandler", "service"]);
				});
			}

			if (withEvents) {
				item.events = {};

				_.forIn(service.events, event => {
					// Skip internal event handlers
					if (/^\$/.test(event.name)) return;

					item.events[event.name] = _.omit(event, ["handler", "remoteHandler", "service"]);
				});
			}

			res.push(item);
		});

		return res;
	}

	/**
	 * Get local service list for INFO packet
	 *
	 * @returns {Object}
	 * @memberof ServiceCatalog
	 */
	getLocalNodeServices() {
		let res = [];
		this.services.forEach(service => {
			if (!service.local)
				return;

			let item = {
				name: service.name,
				version: service.version,
				settings: service.settings,
				metadata: service.metadata,
				dependencies: service.dependencies
			};

			item.actions = {};

			_.forIn(service.actions, action => {
				if (action.protected) return;

				item.actions[action.name] = _.omit(action, ["handler", "remoteHandler", "service"]);
			});

			item.events = {};

			_.forIn(service.events, event => {
				// Skip internal event handlers
				if (/^\$/.test(event.name)) return;

				item.events[event.name] = _.omit(event, ["handler", "remoteHandler", "service"]);
			});

			res.push(item);
		});

		return res;
	}

	/**
	 * Remove all endpoints by nodeID
	 *
	 * @param {String} nodeID
	 * @memberof ServiceCatalog
	 */
	removeAllByNodeID(nodeID) {
		_.remove(this.services, service => {
			if (service.node.id == nodeID) {
				this.registry.actions.removeByService(service);
				this.registry.events.removeByService(service);
				return true;
			}
		});
	}

	/**
	 * Remove endpoint by name, version & nodeID
	 *
	 * @param {String} name
	 * @param {any} version
	 * @param {String} nodeID
	 * @memberof ServiceCatalog
	 */
	remove(name, version, nodeID) {
		let service = this.get(name, version, nodeID);
		if (service) {
			this.registry.actions.removeByService(service);
			this.registry.events.removeByService(service);

			_.remove(this.services, svc => svc == service);
		}
	}
}

module.exports = ServiceCatalog;
