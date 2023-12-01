/*
 * moleculer
 * Copyright (c) 2023 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");

const utils = require("../utils");
const Strategies = require("../strategies");
const Discoverers = require("./discoverers");
const NodeCatalog = require("./node-catalog");
const ServiceCatalog = require("./service-catalog");
const EventCatalog = require("./event-catalog");
const ActionCatalog = require("./action-catalog");
const ActionEndpoint = require("./endpoint-action");
const { METRIC } = require("../metrics");

/**
 * Import types
 *
 * @typedef {import("../context")} Context
 * @typedef {import("../service")} Service
 * @typedef {import("./service-item")} ServiceItem
 * @typedef {import("../service").ServiceAction} ServiceAction
 * @typedef {import("../service").ActionSchema} ActionSchema
 * @typedef {import("../service").ServiceEvent} ServiceEvent
 * @typedef {import("../registry")} RegistryClass
 * @typedef {import("../registry").NodeRawInfo} NodeRawInfo
 * @typedef {import("../service-broker")} ServiceBroker
 * @typedef {import("./node")} Node
 * @typedef {import("./endpoint-list")} EndpointList
 * @typedef {import("./endpoint")} Endpoint
 */

/**
 * Service Registry
 *
 * @class Registry
 * @implements {RegistryClass}
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
		this.metrics = broker.metrics;
		this.logger = broker.getLogger("registry");

		this.opts = Object.assign({}, broker.options.registry);

		this.StrategyFactory = Strategies.resolve(this.opts.strategy);
		this.logger.info(`Strategy: ${this.StrategyFactory.name}`);

		this.discoverer = Discoverers.resolve(this.opts.discoverer);
		this.logger.info(`Discoverer: ${this.broker.getConstructorName(this.discoverer)}`);

		/** @type {boolean|string} */
		this.localNodeInfoInvalidated = true;

		this.nodes = new NodeCatalog(this, broker);
		this.services = new ServiceCatalog(this, broker);
		this.actions = new ActionCatalog(this, broker, this.StrategyFactory);
		this.events = new EventCatalog(this, broker, this.StrategyFactory);

		this.registerMoleculerMetrics();
		this.updateMetrics();
	}

	init(/*broker*/) {
		this.discoverer.init(this);
	}

	stop() {
		return this.discoverer.stop();
	}

	/**
	 * Register Moleculer Core metrics.
	 */
	registerMoleculerMetrics() {
		if (!this.broker.isMetricsEnabled()) return;

		this.metrics.register({
			name: METRIC.MOLECULER_REGISTRY_NODES_TOTAL,
			type: METRIC.TYPE_GAUGE,
			description: "Number of registered nodes"
		});
		this.metrics.register({
			name: METRIC.MOLECULER_REGISTRY_NODES_ONLINE_TOTAL,
			type: METRIC.TYPE_GAUGE,
			description: "Number of online nodes"
		});
		this.metrics.register({
			name: METRIC.MOLECULER_REGISTRY_SERVICES_TOTAL,
			type: METRIC.TYPE_GAUGE,
			description: "Number of registered services"
		});
		this.metrics.register({
			name: METRIC.MOLECULER_REGISTRY_SERVICE_ENDPOINTS_TOTAL,
			type: METRIC.TYPE_GAUGE,
			labelNames: ["service"],
			description: "Number of service endpoints"
		});
		this.metrics.register({
			name: METRIC.MOLECULER_REGISTRY_ACTIONS_TOTAL,
			type: METRIC.TYPE_GAUGE,
			description: "Number of registered actions"
		});
		this.metrics.register({
			name: METRIC.MOLECULER_REGISTRY_ACTION_ENDPOINTS_TOTAL,
			type: METRIC.TYPE_GAUGE,
			labelNames: ["action"],
			description: "Number of action endpoints"
		});
		this.metrics.register({
			name: METRIC.MOLECULER_REGISTRY_EVENTS_TOTAL,
			type: METRIC.TYPE_GAUGE,
			description: "Number of registered events"
		});
		this.metrics.register({
			name: METRIC.MOLECULER_REGISTRY_EVENT_ENDPOINTS_TOTAL,
			type: METRIC.TYPE_GAUGE,
			labelNames: ["event"],
			description: "Number of event endpoints"
		});
	}

	/**
	 * Update metrics.
	 */
	updateMetrics() {
		if (!this.broker.isMetricsEnabled()) return;

		this.metrics.set(METRIC.MOLECULER_REGISTRY_NODES_TOTAL, this.nodes.count());
		this.metrics.set(METRIC.MOLECULER_REGISTRY_NODES_ONLINE_TOTAL, this.nodes.onlineCount());

		const services = this.services.list({
			grouping: true,
			onlyLocal: false,
			onlyAvailable: false,
			skipInternal: false,
			withActions: false,
			withEvents: false
		});
		this.metrics.set(METRIC.MOLECULER_REGISTRY_SERVICES_TOTAL, services.length);
		services.forEach(svc =>
			this.metrics.set(
				METRIC.MOLECULER_REGISTRY_SERVICE_ENDPOINTS_TOTAL,
				svc.nodes ? svc.nodes.length : 0,
				{ service: svc.fullName }
			)
		);

		const actions = this.actions.list({ withEndpoints: true });
		this.metrics.set(METRIC.MOLECULER_REGISTRY_ACTIONS_TOTAL, actions.length);
		actions.forEach(item =>
			this.metrics.set(
				METRIC.MOLECULER_REGISTRY_ACTION_ENDPOINTS_TOTAL,
				item.endpoints ? item.endpoints.length : 0,
				{ action: item.name }
			)
		);

		const events = this.events.list({ withEndpoints: true });
		this.metrics.set(METRIC.MOLECULER_REGISTRY_EVENTS_TOTAL, events.length);
		events.forEach(item =>
			this.metrics.set(
				METRIC.MOLECULER_REGISTRY_EVENT_ENDPOINTS_TOTAL,
				item.endpoints ? item.endpoints.length : 0,
				{ event: item.name }
			)
		);
	}

	/**
	 * Register local service
	 *
	 * @param {Service} svc
	 * @memberof Registry
	 */
	registerLocalService(svc) {
		if (!this.services.has(svc.fullName, this.broker.nodeID)) {
			const service = this.services.add(this.nodes.localNode, svc, true);

			if (svc.actions) this.registerActions(this.nodes.localNode, service, svc.actions);

			if (svc.events) this.registerEvents(this.nodes.localNode, service, svc.events);

			this.nodes.localNode.services.push(service);

			//this.regenerateLocalRawInfo(true);
			this.localNodeInfoInvalidated = "seq";

			this.logger.info(`'${svc.name}' service is registered.`);

			this.broker.servicesChanged(true);
			this.updateMetrics();
		}
	}

	/**
	 * Register remote services
	 *
	 * @param {Node} node
	 * @param {Array} serviceList
	 * @memberof Registry
	 */
	registerServices(node, serviceList) {
		serviceList.forEach(svc => {
			if (!svc.fullName)
				svc.fullName = this.broker.ServiceFactory.getVersionedFullName(
					svc.name,
					svc.version
				);

			let prevActions, prevEvents;
			let service = this.services.get(svc.fullName, node.id);
			if (!service) {
				service = this.services.add(node, svc, false);
			} else {
				prevActions = Object.assign({}, service.actions);
				prevEvents = Object.assign({}, service.events);
				service.update(svc);
			}

			//Register actions
			if (svc.actions) {
				this.registerActions(node, service, svc.actions);
			}

			// remove old actions which is not exist
			if (prevActions) {
				_.forIn(prevActions, (action, name) => {
					if (!svc.actions || !svc.actions[name]) {
						this.unregisterAction(node, name);
					}
				});
			}

			//Register events
			if (svc.events) {
				this.registerEvents(node, service, svc.events);
			}

			// remove old events which is not exist
			if (prevEvents) {
				_.forIn(prevEvents, (event, name) => {
					if (!svc.events || !svc.events[name]) {
						this.unregisterEvent(node, name);
					}
				});
			}
		});

		// remove old services which is not exist in new serviceList
		// Please note! At first, copy the array because you can't remove items inside forEach
		const prevServices = Array.from(this.services.services);
		prevServices.forEach(service => {
			if (service.node != node) return;

			let exist = false;
			serviceList.forEach(svc => {
				if (service.equals(svc.fullName)) exist = true;
			});

			// This service is removed on remote node!
			if (!exist) {
				this.unregisterService(service.fullName, node.id);
			}
		});

		this.broker.servicesChanged(false);
		this.updateMetrics();
	}

	/**
	 * Check the action visiblity.
	 *
	 * 	Available values:
	 * 		- "published" or `null`: public action and can be published via API Gateway
	 * 		- "public": public action, can be called remotely but not published via API GW
	 * 		- "protected": can be called from local services
	 * 		- "private": can be called from internally via `this.actions.xy()` inside Service
	 *
	 * @param {ActionSchema} action
	 * @param {Node} node
	 * @returns
	 * @memberof Registry
	 */
	checkActionVisibility(action, node) {
		if (
			action.visibility == null ||
			action.visibility == "published" ||
			action.visibility == "public"
		)
			return true;

		if (action.visibility == "protected" && node.local) return true;

		return false;
	}

	/**
	 * Register service actions
	 *
	 * @param {Node} node
	 * @param {ServiceItem} service
	 * @param {Record<string, ActionSchema>} actions
	 * @memberof Registry
	 */
	registerActions(node, service, actions) {
		_.forIn(actions, action => {
			if (!this.checkActionVisibility(action, node)) return;

			if (node.local) {
				action.handler = this.broker.middlewares.wrapHandler(
					"localAction",
					action.handler,
					action
				);
			} else if (this.broker.transit) {
				action.handler = this.broker.middlewares.wrapHandler(
					"remoteAction",
					this.broker.transit.request.bind(this.broker.transit),
					{ ...action, service }
				);
			}
			if (this.broker.options.disableBalancer && this.broker.transit)
				action.remoteHandler = this.broker.middlewares.wrapHandler(
					"remoteAction",
					this.broker.transit.request.bind(this.broker.transit),
					{ ...action, service }
				);

			this.actions.add(node, service, action);
			service.addAction(action);
		});
	}

	/**
	 * Create a local Endpoint for private actions
	 *
	 * @param {ActionSchema} action
	 * @returns {ActionEndpoint}
	 * @memberof Registry
	 */
	createPrivateActionEndpoint(action) {
		return new ActionEndpoint(this, this.broker, this.nodes.localNode, action.service, action);
	}

	/**
	 * Check the service is exist
	 *
	 * @param {String} fullName
	 * @param {String} nodeID
	 * @returns {Boolean}
	 * @memberof Registry
	 */
	hasService(fullName, nodeID) {
		return this.services.has(fullName, nodeID);
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
		if (list) return list.getEndpointByNodeID(nodeID);
	}

	/**
	 * Unregister service
	 *
	 * @param {String} fullName
	 * @param {String?} nodeID
	 * @memberof Registry
	 */
	unregisterService(fullName, nodeID) {
		nodeID = nodeID || this.broker.nodeID;
		this.services.remove(fullName, nodeID);

		if (nodeID == this.broker.nodeID) {
			// Clean the local node services
			const idx = this.nodes.localNode.services.findIndex(svc => svc.fullName === fullName);
			if (idx !== -1) this.nodes.localNode.services.splice(idx, 1);
		}

		if (nodeID == this.broker.nodeID) {
			this.localNodeInfoInvalidated = "seq";
			//this.regenerateLocalRawInfo(true);
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
	 * @param {Record<string, ServiceEvent>} events
	 * @memberof Registry
	 */
	registerEvents(node, service, events) {
		_.forIn(events, event => {
			if (node.local)
				event.handler = this.broker.middlewares.wrapHandler(
					"localEvent",
					event.handler,
					event
				);

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
	 * @param {boolean} incSeq
	 * @param {boolean=} isStopping
	 *
	 * @returns {NodeRawInfo}
	 * @memberof Registry
	 */
	regenerateLocalRawInfo(incSeq, isStopping) {
		let node = this.nodes.localNode;
		if (incSeq) node.seq++;

		const rawInfo = _.pick(node, [
			"ipList",
			"hostname",
			"instanceID",
			"client",
			"config",
			"port",
			"seq",
			"metadata"
		]);

		if (!isStopping && (this.broker.started || incSeq)) {
			rawInfo.services = this.services.getLocalNodeServices();
		} else {
			rawInfo.services = [];
		}

		// Make to be safety
		node.rawInfo = utils.safetyObject(rawInfo, this.broker.options);

		return node.rawInfo;
	}

	/**
	 * Generate local node info for INFO packets
	 *
	 * @param {boolean=} force
	 * @returns {NodeRawInfo}
	 * @memberof Registry
	 */
	getLocalNodeInfo(force) {
		if (force || !this.nodes.localNode.rawInfo || this.localNodeInfoInvalidated) {
			const res = this.regenerateLocalRawInfo(this.localNodeInfoInvalidated == "seq");
			this.logger.debug("Local Node info regenerated.");
			this.localNodeInfoInvalidated = false;
			return res;
		}

		return this.nodes.localNode.rawInfo;
	}

	/**
	 * Generate node info for INFO packets
	 *
	 * @param {String} nodeID
	 * @returns {NodeRawInfo}
	 * @memberof Registry
	 */
	getNodeInfo(nodeID) {
		const node = this.nodes.get(nodeID);
		if (!node) return null;

		if (node.local) return this.getLocalNodeInfo();

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
	 * Get list of registered nodes
	 *
	 * @param {object?} opts
	 * @returns
	 * @memberof Registry
	 */
	getNodeList(opts) {
		return this.nodes.list(opts);
	}

	/**
	 * Get list of registered services
	 *
	 * @param {object?} opts
	 * @returns
	 * @memberof Registry
	 */
	getServiceList(opts) {
		return this.services.list(opts);
	}

	/**
	 * Get list of registered actions
	 *
	 * @param {object?} opts
	 * @returns
	 * @memberof Registry
	 */
	getActionList(opts) {
		return this.actions.list(opts);
	}

	/**
	 * Get list of registered events
	 *
	 * @param {object?} opts
	 * @returns
	 * @memberof Registry
	 */
	getEventList(opts) {
		return this.events.list(opts);
	}

	/**
	 * Get a raw info list from nodes
	 *
	 * @returns {Array<NodeRawInfo>}
	 * @memberof Registry
	 */
	getNodeRawList() {
		return this.nodes.toArray().map(node => node.rawInfo);
	}
}

module.exports = Registry;
