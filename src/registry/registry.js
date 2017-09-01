/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");

const NodeCatalog = require("./node-catalog");
const ServiceCatalog = require("./service-catalog");
const EventCatalog = require("./event-catalog");
const ActionCatalog = require("./action-catalog");

const RoundRobinStrategy = require("../strategies").RoundRobin;

class Registry {

	constructor(broker) {
		this.broker = broker;
		this.logger = broker.getLogger("registry");

		this.opts = Object.assign({}, broker.options.registry);
		this.opts.circuitBreaker = broker.options.circuitBreaker || {};

		this.StrategyFactory = this.opts.StrategyFactory || RoundRobinStrategy;

		this.nodes = new NodeCatalog(this, broker);
		this.services = new ServiceCatalog(this, broker);
		this.actions = new ActionCatalog(this, broker, RoundRobinStrategy);
		this.events = new EventCatalog(this, broker, RoundRobinStrategy);

	}

	registerLocalService(svc) {
		const service = this.services.add(this.nodes.localNode, svc.name, svc.version, svc.settings);

		if (svc.actions)
			this.registerActions(this.nodes.localNode, service, svc.actions);

		if (svc.events)
			this.registerEvents(this.nodes.localNode, service, svc.events);

		this.logger.info(`'${service.name}' service is registered!`);
	}

	registerServices(node, serviceList) {
		serviceList.forEach(svc => {
			let prevActions, prevEvents;
			let service = this.services.get(svc.name, svc.version, node.id);
			if (!service) {
				service = this.services.add(node, svc.name, svc.version, svc.settings);
			} else {
				prevActions = Object.assign({}, service.actions);
				prevEvents = Object.assign({}, service.events);
				service.update(svc);
			}

			//Register actions
			if (svc.actions)
				this.registerActions(node, service, svc.actions);

			// remove old actions which is not exist
			if (prevActions) {
				_.forIn(prevActions, (action, name) => {
					if (!svc.actions[name])
						this.unregisterAction(node, name);
				});
			}

			//Register events
			if (svc.events)
				this.registerEvents(node, service, svc.events);

			// remove old actions which is not exist
			if (prevEvents) {
				_.forIn(prevEvents, (event, name) => {
					if (!svc.events[name])
						this.unregisterEvent(node, name);
				});
			}
		});

		// remove old services which is not exist in new serviceList
		this.services.services.forEach(service => {
			if (service.node != node) return;

			let exist = false;
			serviceList.forEach(svc => {
				if (service.equals(svc.name, svc.version))
					exist = true;
			});

			if (!exist) {
				// This service is removed on remote node!
				this.unregisterService(service.name, service.version, node.id);
			}
		});
	}

	registerActions(node, service, actions) {
		_.forIn(actions, action => {
			this.actions.add(node, service, action);
			service.addAction(action);
		});
	}

	getActionEndpoints(actionName) {
		return this.actions.get(actionName);
	}

	getActionEndpointByNodeId(actionName, nodeID) {
		const list = this.actions.get(actionName);
		if (list)
			return list.getEndpointByNodeID(nodeID);
	}

	unregisterService(name, version, nodeID) {
		this.services.remove(name, version, nodeID || this.broker.nodeID);
	}

	unregisterServicesByNode(nodeID) {
		this.services.removeAllByNodeID(nodeID);
	}

	unregisterAction(node, name) {
		this.actions.remove(name, node.id);
	}

	registerEvents(node, service, events) {
		_.forIn(events, event => {
			this.events.add(node, service, event);
			service.addEvent(event);
		});
	}

	unregisterEvent(node, name) {
		this.events.remove(name, node.id);
	}

	getLocalNodeInfo() {
		const res = _.pick(this.nodes.localNode, ["ipList", "client", "config", "port"]);
		res.services = this.services.list({ onlyLocal: true, withActions: true, withEvents: true });

		//this.logger.info("LOCAL SERVICES", res.services);
		return res;
	}

}

module.exports = Registry;
