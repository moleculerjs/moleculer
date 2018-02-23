/*
 * moleculer
 * Copyright (c) 2018 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");

const NodeCatalog = require("./node-catalog");
const ServiceCatalog = require("./service-catalog");
const EventCatalog = require("./event-catalog");
const ActionCatalog = require("./action-catalog");

/**
 * Service Registry
 *
 * @class Registry
 */
class Registry {

	/**
	 * Creates an instance of Registry.
	 *
	 * @param {any} broker
	 * @memberof Registry
	 */
	constructor(broker) {
		this.broker = broker;
		this.logger = broker.getLogger("registry");

		this.opts = Object.assign({}, broker.options.registry);
		this.opts.circuitBreaker = broker.options.circuitBreaker || {};

		this.StrategyFactory = broker._resolveStrategy(this.opts.strategy);

		this.logger.info("Strategy:", this.StrategyFactory.name);

		this.nodes = new NodeCatalog(this, broker);
		this.services = new ServiceCatalog(this, broker);
		this.actions = new ActionCatalog(this, broker, this.StrategyFactory);
		this.events = new EventCatalog(this, broker, this.StrategyFactory);

		this.broker.localBus.on("$broker.started", () => {
			if (this.nodes.localNode) {
				this.nodes.localNode.seq++;
				this.regenerateLocalRawInfo();
			}
		});
	}

	/**
	 * Register local service
	 *
	 * @param {Service} svc
	 * @memberof Registry
	 */
	registerLocalService(svc) {
		const service = this.services.add(this.nodes.localNode, svc.name, svc.version, svc.settings, svc.metadata);

		if (svc.actions)
			this.registerActions(this.nodes.localNode, service, svc.actions);

		if (svc.events)
			this.registerEvents(this.nodes.localNode, service, svc.events);

		this.nodes.localNode.services.push(service);

		if (this.broker.started)
			this.nodes.localNode.seq++;

		this.regenerateLocalRawInfo();

		this.logger.info(`'${svc.name}' service is registered.`);
	}

	/**
	 * Register remote services
	 *
	 * @param {Nodeany} node
	 * @param {Array} serviceList
	 * @memberof Registry
	 */
	registerServices(node, serviceList) {
		serviceList.forEach(svc => {
			let prevActions, prevEvents;
			let service = this.services.get(svc.name, svc.version, node.id);
			if (!service) {
				service = this.services.add(node, svc.name, svc.version, svc.settings, svc.metadata);
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

	/**
	 * Register service actions
	 *
	 * @param {Node} node
	 * @param {Service} service
	 * @param {Object} actions
	 * @memberof Registry
	 */
	registerActions(node, service, actions) {
		_.forIn(actions, action => {
			this.actions.add(node, service, action);
			service.addAction(action);
		});
	}

	/**
	 * Check the service is exist
	 *
	 * @param {String} name
	 * @param {any} version
	 * @param {String} nodeID
	 * @returns {Boolean}
	 * @memberof Registry
	 */
	hasService(name, version, nodeID) {
		return this.services.has(name, version, nodeID);
	}

	/**
	 * Get endpoint list of action by name
	 *
	 * @param {String} actionName
	 * @returns {EndpointList}
	 * @memberof Registry
	 */
	getActionEndpoints(actionName) {
		return this.actions.get(actionName);
	}

	/**
	 * Get an endpoint of action on a specified node
	 *
	 * @param {String} actionName
	 * @param {String} nodeID
	 * @returns {Endpoint}
	 * @memberof Registry
	 */
	getActionEndpointByNodeId(actionName, nodeID) {
		const list = this.actions.get(actionName);
		if (list)
			return list.getEndpointByNodeID(nodeID);
	}

	/**
	 * Unregister service
	 *
	 * @param {String} name
	 * @param {any} version
	 * @param {String?} nodeID
	 * @memberof Registry
	 */
	unregisterService(name, version, nodeID) {
		this.services.remove(name, version, nodeID || this.broker.nodeID);

		if (!nodeID || nodeID == this.broker.nodeID) {
			this.nodes.localNode.seq++;

			this.regenerateLocalRawInfo();
		}
	}

	/**
	 * Unregister all services by nodeID
	 *
	 * @param {String} nodeID
	 * @memberof Registry
	 */
	unregisterServicesByNode(nodeID) {
		this.services.removeAllByNodeID(nodeID);
	}

	/**
	 * Unregister an action by node & name
	 *
	 * @param {Node} node
	 * @param {String} actionName
	 * @memberof Registry
	 */
	unregisterAction(node, actionName) {
		this.actions.remove(actionName, node.id);
	}

	/**
	 * Register service events
	 *
	 * @param {Node} node
	 * @param {ServiceItem} service
	 * @param {Object} events
	 * @memberof Registry
	 */
	registerEvents(node, service, events) {
		_.forIn(events, event => {
			this.events.add(node, service, event);
			service.addEvent(event);
		});
	}

	/**
	 * Unregister event by name & node
	 *
	 * @param {Node} node
	 * @param {String} eventName
	 * @memberof Registry
	 */
	unregisterEvent(node, eventName) {
		this.events.remove(eventName, node.id);
	}

	/**
	 * Generate local raw info for INFO packet
	 *
	 * @memberof Registry
	 */
	regenerateLocalRawInfo() {
		let node = this.nodes.localNode;
		node.rawInfo = _.pick(node, ["ipList", "hostname", "client", "config", "port", "seq"]);
		if (this.broker.started)
			node.rawInfo.services = this.services.getLocalNodeServices();
		else
			node.rawInfo.services = [];

		return node.rawInfo;
	}

	/**
	 * Generate local node info for INFO packets
	 *
	 * @returns
	 * @memberof Registry
	 */
	getLocalNodeInfo(force) {
		if (force || !this.nodes.localNode.rawInfo)
			return this.regenerateLocalRawInfo();

		return this.nodes.localNode.rawInfo;
	}

	/**
	 * Generate node info for INFO packets
	 *
	 * @returns
	 * @memberof Registry
	 */
	getNodeInfo(nodeID) {
		const node = this.nodes.get(nodeID);
		if (!node)
			return null;

		if (node.local)
			return this.getLocalNodeInfo();

		return node.rawInfo;
	}

	/**
	 * Process an incoming node INFO packet
	 *
	 * @param {any} payload
	 * @returns
	 * @memberof Registry
	 */
	processNodeInfo(payload) {
		return this.nodes.processNodeInfo(payload);
	}

	/**
	 * Process an incoming node DISCONNECTED packet
	 *
	 * @param {any} payload
	 * @returns
	 * @memberof Registry
	 */
	nodeDisconnected(payload) {
		return this.nodes.disconnected(payload.sender, false);
	}

	/**
	 * Process an incoming node HEARTBEAT packet
	 *
	 * @param {any} payload
	 * @returns
	 * @memberof Registry
	 */
	nodeHeartbeat(payload) {
		return this.nodes.heartbeat(payload);
	}

	/**
	 * Get list of registered nodes
	 *
	 * @param {any} opts
	 * @returns
	 * @memberof Registry
	 */
	getNodeList(opts) {
		return this.nodes.list(opts);
	}

	/**
	 * Get list of registered services
	 *
	 * @param {any} opts
	 * @returns
	 * @memberof Registry
	 */
	getServiceList(opts) {
		return this.services.list(opts);
	}

	/**
	 * Get list of registered actions
	 *
	 * @param {any} opts
	 * @returns
	 * @memberof Registry
	 */
	getActionList(opts) {
		return this.actions.list(opts);
	}

	/**
	 * Get list of registered events
	 *
	 * @param {any} opts
	 * @returns
	 * @memberof Registry
	 */
	getEventList(opts) {
		return this.events.list(opts);
	}

	/**
	 * Get a raw info list from nodes
	 *
	 * @returns {Array<Object>}
	 * @memberof Registry
	 */
	getNodeRawList() {
		return this.nodes.toArray().map(node => node.rawInfo);
	}
}

module.exports = Registry;
