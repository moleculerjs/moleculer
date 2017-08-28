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

		this.opts = broker.options.registry || {};
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

	nodeDisconnected(nodeID, isUnexpected) {
		let node = this.nodes.get(nodeID);
		if (node && node.available) {
			node.disconnected(isUnexpected);

			this.unregisterServicesByNode(node.id);

			this.broker.emitLocal("$node.disconnected", { node, unexpected: !!isUnexpected });

			this.logger.warn(`Node '${node.id}' disconnected!`);

			this.broker.servicesChanged(false);
		}
	}

	nodeHeartbeat(payload) {
		this.logger.info("HEARTBEAT:", payload);
		this.nodes.heartbeat(payload);
	}

	registerLocalService(svc) {
		const service = this.services.add(this.nodes.localNode, svc.name, svc.version, svc.settings);

		this.registerActions(this.nodes.localNode, service, svc.actions);

		this.logger.info(`'${service.name}' service is registered!`);
	}

	registerServices(node, serviceList) {
		this.logger.info("SERVICELIST:", serviceList); // TODO

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

	registerActions(node, service, actions) {
		_.forIn(actions, action => {
			this.actions.add(node, service, action);
			service.addAction(action);
		});

		// TODO: remove old services which is not exist in new actions
	}

	getActionEndpoints(actionName) {
		return this.actions.get(actionName);
	}

	getActionEndpointByNodeId(actionName, nodeID) {
		// TODO
		//return this.actions.get(actionName);
	}

	unregisterService(name, version) {
		this.services.remove(name, version, this.broker.nodeID);
	}

	unregisterServicesByNode(nodeID) {
		this.services.removeAllByNodeID(nodeID);
	}


	getLocalNodeInfo() {
		const res = _.pick(this.nodes._localNode, ["uptime", "ipList", "versions"]);
		res.services = this.services.list({ onlyLocal: true, withActions: true });
		res.events = {}; // TODO

		return res;
	}

	/**
	 * Get a filtered list of actions
	 *
	 * @param {Object} {onlyLocal = false, skipInternal = false, withEndpoints = false}
	 * @returns {Array}
	 *
	 * @memberof Registry
	 */
	getActionList({onlyLocal = false, skipInternal = false, withEndpoints = false}) {
		let res = [];
		/* TODO
		this.actions.forEach((entry, key) => {
			if (skipInternal && /^\$node/.test(key))
				return;

			if (onlyLocal && !entry.hasLocal())
				return;

			let item = {
				name: key,
				count: entry.count(),
				hasLocal: entry.hasLocal(),
				available: entry.hasAvailable()
			};

			if (item.count > 0) {
				const ep = entry.list[0];
				if (ep)
					item.action = _.omit(ep.action, ["handler", "service"]);
			}
			if (item.action == null || item.action.protected === true) return;

			if (withEndpoints) {
				if (item.count > 0) {
					item.endpoints = entry.list.map(endpoint => {
						return {
							nodeID: endpoint.nodeID,
							state: endpoint.state
						};
					});
				}
			}

			res.push(item);
		});
		*/
		return res;
	}
}

module.exports = Registry;
