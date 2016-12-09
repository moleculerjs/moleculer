"use strict";

let bus = require("./service-bus");
let ServiceNode = require("./service-node");
let Context = require("./context");

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
		if (node && !this.nodes.has(node.id)) {
			this.nodes.set(node.id, node);
			bus.emit("register.node", node);
		}

		// Append service by name
		let item = this.services.get(service.name) || [];
		item.push(service);
		this.services.set(service.name, service);

		bus.emit("register.service", service);
	}

	registerAction(node, service, action) {
		// Append service by name
		let item = this.actions.get(action.name) || [];
		item.push(action);
		this.actions.set(action.name, action);
		bus.emit("register.action", service, action);
	}

	subscribeEvent(node, service, event) {
		// Append event subscriptions
		let item = this.subscriptions.get(event.name) || [];
		item.push(event);
		this.subscriptions.set(event.name, event);
		bus.on(event.name, event.handler.bind(service));
	}

	getService(serviceName) {

	}

	hasActionHandler(actionName) {
		return this.actions.has(actionName);
	}

	action(actionName, params, ctx) {
		let actions = this.actions.get(actionName);
		if (!actions)
			throw new Error(`Missing action '${actionName}'!`);
		
		let action = this.getBalancedItem(actions);
		if (ctx == null) {
			// Create a new context
			ctx = new Context({
				service: action.service,
				action: action,
				params: params
			});
		} else {
			ctx.setParams(params);
		}
		
		return action.handler(ctx);
	}

}

module.exports = ServiceBroker;