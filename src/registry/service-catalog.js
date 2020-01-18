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
	 * @param {Object} service
	 * @param {Boolean} local
	 *
	 * @returns {ServiceItem}
	 *
	 * @memberof ServiceCatalog
	 */
	add(node, service, local) {
		const item = new ServiceItem(node, service, local);
		this.services.push(item);
		return item;
	}

	/**
	 * Check the service is exist
	 *
	 * @param {String} fullName
	 * @param {String} nodeID
	 * @returns
	 * @memberof ServiceCatalog
	 */
	has(fullName, nodeID) {
		return this.services.find(svc => svc.equals(fullName, nodeID)) != null;
	}

	/**
	 * Get a service by fullName & nodeID
	 *
	 * @param {String} fullName
	 * @param {String} nodeID
	 * @returns
	 * @memberof ServiceCatalog
	 */
	get(fullName, nodeID) {
		return this.services.find(svc => svc.equals(fullName, nodeID));
	}

	/**
	 * Get a filtered list of services with actions
	 *
	 * @param {Object} {onlyLocal = false,  onlyAvailable = false, skipInternal = false, withActions = false, withEvents = false, grouping = false}
	 * @returns {Array}
	 *
	 * @memberof Registry
	 */
	list({ onlyLocal = false, onlyAvailable = false, skipInternal = false, withActions = false, withEvents = false, grouping = false }) {
		let res = [];
		this.services.forEach(service => {
			if (skipInternal && /^\$/.test(service.name))
				return;

			if (onlyLocal && !service.local)
				return;

			if (onlyAvailable && !service.node.available)
				return;

			let item;
			if (grouping)
				item = res.find(svc => svc.fullName == service.fullName);

			if (!item) {
				let item = {
					name: service.name,
					version: service.version,
					fullName: service.fullName,
					settings: service.settings,
					metadata: service.metadata,
					available: service.node.available,
				};

				if (grouping)
					item.nodes = [service.node.id];
				else
					item.nodeID = service.node.id;

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

			} else {
				if (item.nodes.indexOf(service.node.id) === -1)
					item.nodes.push(service.node.id);
			}
		});

		return res;
	}
	/*
	getServicesWithNodes() {
		let res = [];
		this.services.forEach(service => {
			let item = res.find(svc => svc.name == service.name && svc.version == service.version);
			if (!item) {
				item = {
					name: service.name,
					version: service.version,
					nodes: []
				};
				res.push(item);
			}
			if (item.nodes.indexOf(service.node.id) === -1)
				item.nodes.push(service.node.id);
		});

		return res;
	}
*/
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
				fullName: service.fullName,
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
				// Leave internal event handlers, because it can be used for internal events.
				//if (/^\$/.test(event.name)) return;

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
	 * Remove endpoint by fullName & nodeID
	 *
	 * @param {String} fullName
	 * @param {String} nodeID
	 * @memberof ServiceCatalog
	 */
	remove(fullName, nodeID) {
		let service = this.get(fullName, nodeID);
		if (service) {
			this.registry.actions.removeByService(service);
			this.registry.events.removeByService(service);

			_.remove(this.services, svc => svc == service);
		}
	}
}

module.exports = ServiceCatalog;
