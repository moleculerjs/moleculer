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

	}

	processNodeInfo(payload) {
		this.nodes.processNodeInfo(payload);
	}

	nodeDisconnected(nodeID, unexpected) {
		// TODO
	}

	registerLocalService(svc) {
		const service = this.services.add(this.broker.nodeID, svc.name, svc.version, service.settings);

		this.registerActions(this.nodes.localNode, service, svc.actions);

		this.logger.info(`'${service.name}' service is registered!`);
	}

	registerServices(node, serviceList) {
		serviceList.forEach(svc => {
			let service = this.services.get(svc.name, svc.version, node.id);
			if (!service) {
				service = this.services.add(node, svc.name, svc.version, svc.settings);
			} else {
				service.update(svc);
			}

			this.registerActions(node, service, svc.actions);

		});

		// TODO: remove old services which is not exist in new serviceList
	}

	unregisterService(node, serviceName) {
		// TODO
	}


	registerActions(node, service, actions) {
		_.forIn(actions, action => {
			this.actions.add(node, service, action);
		});

		// TODO: remove old services which is not exist in new actions
	}

	getActionEndpoints(actionName) {
		return this.actions.get(actionName);
	}

/*
	unregisterService(nodeID, serviceName) {

	}

	unregisterServicesByNode(nodeID) {

	}
	*/
}

module.exports = Registry;
