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
		this.lastHeartbeatTime = Date.now();
		this.cpu = null;
		this.config = {};
		this.port = null;

		this.ipList = null;
		this.client = null;

		this.services = null;
		this.events = null;
	}

	update(payload) {
		// Update properties
		this.ipList = payload.ipList;
		this.client = payload.client;

		// Process services & events
		this.services = payload.services;
		this.events = payload.events;
	}

	heartbeat(payload) {
		this.cpu = payload.cpu;
		this.lastHeartbeatTime = Date.now();
		this.available = true;
		// TODO: If was unavailable, request an INFO from this node
		// because we removed node services & events from registry.
	}

	disconnected() {
		this.available = false;
	}
}

module.exports = Node;
