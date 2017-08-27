/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");

const NodeCatalog = require("node-catalog");
const ServiceCatalog = require("service-catalog");
const EventCatalog = require("event-catalog");
const ActionCatalog = require("action-catalog");

const RoundRobinStrategy = require("../strategies").RoundRobin;

class Registry {

	constructor(broker) {
		this.broker = broker;
		this.logger = broker.getLogger("registry");

		this.opts = broker.options.serviceRegistry;
		this.opts.circuitBreaker = broker.options.circuitBreaker || {};

		this.strategy = this.opts.strategy || new RoundRobinStrategy();

		this.nodes = new NodeCatalog(this, broker, this.logger);
		this.services = new ServiceCatalog(this, broker, this.logger);
		this.events = new EventCatalog(this, broker, this.logger);
		this.actions = new ActionCatalog(this, broker, this.logger);

		this.broker.on("$node.info", payload => {
			this.nodes.processNodeInfo(payload);
		});

	}

	registerLocalService(svc) {
		const service = this.services.add(this.broker.nodeID, svc.name, svc.version, service.settings);

		this.registerActions(this.broker.nodeID, service, svc.actions);

		this.logger.info(`'${service.name}' service is registered!`);
	}

	registerServices(nodeID, serviceList) {
		serviceList.forEach(svc => {
			let service = this.services.get(svc.name, svc.version, nodeID);
			if (!service) {
				service = this.services.add(nodeID, svc.name, svc.version, svc.settings);
			} else {
				service.update(svc);
			}

			this.registerActions(nodeID, service, svc.actions);

		});

		// TODO: remove old services which is not exist in new serviceList
	}

	registerActions(nodeID, service, actions) {
		_.forIn(actions, (action, name) => {
			this.actions.add(nodeID, action);
		});

		// TODO: remove old services which is not exist in new actions
	}

/*
	registerLocalService(service) {
		let item = new ServiceItem(this.broker.nodeID, service.name, service.version, service.settings, true);

		this.services.add(item);

		this.logger.info(`'${service.name}' service is registered!`);
	}

	registerRemoteService(nodeID, service) {
		let item = new ServiceItem(nodeID, service.name, service.version, service.settings, false);

		this.services.add(item);

		if (service.actions) {
			_.forIn(service.actions, action => {
				this.registerAction(nodeID, action, service);
			});
		}
	}

	unregisterService(nodeID, serviceName) {

	}

	unregisterServicesByNode(nodeID) {

	}
	*/
}

module.exports = Registry;
