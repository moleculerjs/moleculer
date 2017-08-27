/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

class Node {
	constructor(id) {
		this.id = id;
		this.available = true;
		this.local = false;
		this.lastHeartbeat = Date.now();

		this.uptime = null;
		this.ipList = null;
		this.versions = null;

		this.services = null;
		this.events = null;
	}

	update(payload) {
		// Update properties
		this.uptime = payload.uptime;
		this.ipList = payload.ipList;
		this.versions = payload.versions;

		// Process services & events
		this.services = payload.services;
		this.events = payload.events;
	}
}

module.exports = Node;
