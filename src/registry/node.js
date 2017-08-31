/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const { getCpuInfo } 	= require("../health");

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

	updateLocalInfo() {
		this.cpu = getCpuInfo().utilization;
	}

	heartbeat(payload) {
		this.cpu = payload.cpu;
		this.lastHeartbeatTime = Date.now();
		this.available = true;
	}

	disconnected() {
		this.available = false;
	}
}

module.exports = Node;
