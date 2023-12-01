/*
 * moleculer
 * Copyright (c) 2023 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

/**
 * Import types
 *
 * @typedef {import("./service-item")} ServiceItemClass
 * @typedef {import("./node")} Node
 * @typedef {import("../service").ActionSchema} ActionSchema
 * @typedef {import("../service").ServiceEvent} ServiceEvent
 */

/**
 * Service class
 *
 * @class ServiceItem
 * @implements {ServiceItemClass}
 */
class ServiceItem {
	/**
	 * Creates an instance of ServiceItem.
	 *
	 * @param {Node} node
	 * @param {object} service
	 * @param {Boolean} local
	 * @memberof ServiceItem
	 */
	constructor(node, service, local) {
		this.node = node;
		this.name = service.name;
		this.fullName = service.fullName;
		this.version = service.version;
		this.settings = service.settings;
		this.metadata = service.metadata || {};

		this.local = !!local;

		this.actions = {};
		this.events = {};
	}

	/**
	 * Check the service equals params
	 *
	 * @param {String} fullName
	 * @param {String=} nodeID
	 * @returns
	 * @memberof ServiceItem
	 */
	equals(fullName, nodeID) {
		return this.fullName == fullName && (nodeID == null || this.node.id == nodeID);
	}

	/**
	 * Update service properties
	 *
	 * @param {object} svc
	 * @memberof ServiceItem
	 */
	update(svc) {
		this.fullName = svc.fullName;
		this.version = svc.version;
		this.settings = svc.settings;
		this.metadata = svc.metadata || {};
	}

	/**
	 * Add action to service
	 *
	 * @param {ActionSchema} action
	 * @memberof ServiceItem
	 */
	addAction(action) {
		this.actions[action.name] = action;
	}

	/**
	 * Add event to service
	 *
	 * @param {ServiceEvent} event
	 * @memberof ServiceItem
	 */
	addEvent(event) {
		this.events[event.name] = event;
	}
}

module.exports = ServiceItem;
