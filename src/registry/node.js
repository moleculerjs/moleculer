/*
 * moleculer
 * Copyright (c) 2018 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const cpuUsage 	= require("../cpu-usage");

/**
 * Node class
 *
 * @class Node
 */
class Node {
	/**
	 * Creates an instance of Node.
	 *
	 * @param {String} id
	 *
	 * @memberof Node
	 */
	constructor(id) {
		this.id = id;
		this.available = true;
		this.local = false;
		this.lastHeartbeatTime = Date.now();
		this.cpu = null;
		this.config = {};
		//this.port = null;
		this.hostname = null;

		this.ipList = null;
		this.client = null;

		this.services = [];
	}

	/**
	 * Update properties
	 *
	 * @param {any} payload
	 * @memberof Node
	 */
	update(payload) {
		// Update properties
		this.ipList = payload.ipList;
		this.hostname = payload.hostname;
		this.client = payload.client;

		// Process services & events
		this.services = payload.services;
	}

	/**
	 * Update local properties
	 *
	 * @memberof Node
	 */
	updateLocalInfo() {
		return cpuUsage().then(res => {
			this.cpu = res.avg;
		});
	}

	/**
	 * Update heartbeat properties
	 *
	 * @param {any} payload
	 * @memberof Node
	 */
	heartbeat(payload) {
		this.cpu = payload.cpu;
		this.lastHeartbeatTime = Date.now();
		this.available = true;
	}

	/**
	 * Node disconnected
	 *
	 * @memberof Node
	 */
	disconnected() {
		this.available = false;
	}
}

module.exports = Node;
