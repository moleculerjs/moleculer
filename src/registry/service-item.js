/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

/**
 * Service class
 *
 * @class ServiceItem
 */
class ServiceItem {

	/**
	 * Creates an instance of ServiceItem.
	 *
	 * @param {Node} node
	 * @param {String} name
	 * @param {any} version
	 * @param {Object} settings
	 * @param {Boolean} local
	 * @memberof ServiceItem
	 */
	constructor(node, name, version, settings, local) {
		this.node = node;
		this.name = name;
		this.version = version;
		this.settings = settings;
		this.local = local;

		this.actions = {};
		this.events = {};
	}

	/**
	 * Check the service equals params
	 *
	 * @param {String} name
	 * @param {any} version
	 * @param {String} nodeID
	 * @returns
	 * @memberof ServiceItem
	 */
	equals(name, version, nodeID) {
		return this.name == name && this.version == version && (nodeID == null || this.node.id == nodeID);
	}

	/**
	 * Update service properties
	 *
	 * @param {any} svc
	 * @memberof ServiceItem
	 */
	update(svc) {
		this.version = svc.version;
		this.settings = svc.settings;
	}

	/**
	 * Add action to service
	 *
	 * @param {any} action
	 * @memberof ServiceItem
	 */
	addAction(action) {
		this.actions[action.name] = action;
	}

	/**
	 * Add event to service
	 *
	 * @param {any} event
	 * @memberof ServiceItem
	 */
	addEvent(event) {
		this.events[event.name] = event;
	}
}

module.exports = ServiceItem;
