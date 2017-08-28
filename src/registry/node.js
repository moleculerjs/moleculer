/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const { getIpList } 			= require("../utils");

class Node {
	constructor(id) {
		this.id = id;
		this.available = true;
		this.local = false;
		this.lastHeartbeatTime = Date.now();

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

	heartbeat(payload) {
		this.lastHeartbeatTime = Date.now();
		this.available = true;
	}

	disconnected() {
		this.available = false;
	}

	updateFromLocal() {
		this.uptime = process.uptime();
		this.ipList = getIpList();
		this.versions = {
			node: process.version,
			//moleculer: this.broker.MOLECULER_VERSION
		};
	}
}

module.exports = Node;
