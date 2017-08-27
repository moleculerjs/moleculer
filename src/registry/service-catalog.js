/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
//const BaseCatalog = require("./base-catalog");
const ServiceItem = require("service-item");

class ServiceCatalog {

	constructor(registry, broker, logger) {
		this.registry = registry;
		this.broker = broker;
		this.logger = logger;

		this.services = [];

		broker.on("$node.info", this.onNodeInfo);
	}

	add(nodeID, name, version, settings) {
		const item = new ServiceItem(nodeID, name, version, settings, nodeID == this.broker.nodeID);
		this.services.push(item);
	}

	has(name, version, nodeID) {
		return this.services.find(svc => svc.equals(name, version, nodeID)) != null;
	}

	get(name, version, nodeID) {
		return this.services.find(svc => svc.equals(name, version, nodeID));
	}

	/*removeByNodeID(nodeID) {
		_.remove(this.services, svc => {
			if (svc.nodeID == nodeID) {
				//
			}
		});
	}*/

}

module.exports = ServiceCatalog;
