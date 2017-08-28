/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
//const BaseCatalog = require("./base-catalog");
const ServiceItem = require("./service-item");

class ServiceCatalog {

	constructor(registry, broker, logger) {
		this.registry = registry;
		this.broker = broker;
		this.logger = logger;

		this.services = [];
	}

	add(node, name, version, settings) {
		const item = new ServiceItem(node, name, version, settings, node.id == this.broker.nodeID);
		this.services.push(item);
		return item;
	}

	has(name, version, nodeID) {
		return this.services.find(svc => svc.equals(name, version, nodeID)) != null;
	}

	get(name, version, nodeID) {
		return this.services.find(svc => svc.equals(name, version, nodeID));
	}

	/**
	 * Get a filtered list of services with actions
	 *
	 * @param {Object} {onlyLocal = false, skipInternal = false, withEndpoints = false}
	 * @returns {Array}
	 *
	 * @memberof Registry
	 */
	list({ onlyLocal = false, skipInternal = false, withActions = false }) {
		let res = [];
		this.services.forEach(service => {
			if (skipInternal && /^\$node/.test(service.name))
				return;

			if (onlyLocal && !service.local)
				return;

			let item = {
				name: service.name,
				version: service.version,
				settings: service.settings,
				nodeID: service.node.id
			};

			if (withActions) {
				item.actions = {};

				_.forIn(service.actions, action => {
					if (action.protected) return;

					item.actions[action.name] = _.omit(action, ["handler", "service"]);
				});
			}

			res.push(item);
		});

		return res;
	}

	removeAllByNodeID(nodeID) {
		_.remove(this.services, service => {
			if (service.node.id == nodeID) {
				this.registry.actions.removeByService(service);
				return true;
			}
		});
	}

	remove(name, version, nodeID) {
		let service = this.get(name, version, nodeID);
		if (service) {
			this.registry.actions.removeByService(service);

			_.remove(this.services, svc => svc == service);
		}
	}
}

module.exports = ServiceCatalog;
