"use strict";

let bus = require("./service-bus");
let ServiceNode = require("./service-node");

class ServiceBroker {

	constructor(options) {
		this.options = options;
		this.nodes = new Map();
		this.services = new Map();
		this.actions = new Map();
		this.subscriptions = new Map();

		// Add self node
		this.internalNode = new ServiceNode({
			id: "internal",
			name: "Internal Service Node",
			type: "internal"
		});

		this.nodes.set(this.internalNode.id, this.internalNode);
	}

	registerService(node, service) {
		// Add node if not exists
		if (node && !this.nodes.has(node.id))
			this.nodes.set(node.id, node);

		// Append service by name
		let item = this.services.get(service.name) || [];
		item.push(service);
		this.services.set(service.name, service);
	}

	registerAction(node, service, action) {

	}

	subscribeEvent(node, service, eventName, handler) {

	}

	getService(serviceName) {

	}

	hasActionHandler(actionName) {

	}

	action(actionName, opts, ctx) {

	}

}

module.exports = ServiceBroker;