/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

class ServiceItem {

	constructor(node, name, version, settings, local) {
		this.node = node;
		this.name = name;
		this.version = version;
		this.settings = settings;
		this.local = local;
	}

	equals(name, version, nodeID) {
		return this.name == name && this.version == version && (nodeID == null || this.node.id == nodeID);
	}

	update(svc) {
		this.version = svc.version;
		this.settings = svc.settings;
	}
}

module.exports = ServiceItem;
