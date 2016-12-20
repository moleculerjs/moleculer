"use strict";

let bus = require("./service-bus");
let BalancedList = require("./balanced-list");
let Context = require("./context");
let errors = require("./errors");
let utils = require("./utils");
let _ = require("lodash");

class ServiceBroker {

	constructor(options) {
		this.options = options || {};
		this.nodes = new Map();
		this.services = new Map();
		this.actions = new Map();
		this.subscriptions = new Map();
		this.transporter = this.options.transporter;

		this.nodeID = this.options.nodeID || utils.getNodeID();

		if (this.transporter) {
			this.transporter.init(this);
		}
	}

	start() {
		if (this.transporter) {
			this.transporter.connect();
		}
	}

	/**
	 * Register a local service
	 * 
	 * @param {any} service
	 * 
	 * @memberOf ServiceBroker
	 */
	registerService(service) {
		// Append service by name
		let item = this.services.get(service.name);
		if (!item) {
			item = new BalancedList();
			this.services.set(service.name, item);
		}
		item.add(service);

		bus.emit(`register.service.${service.name}`, service);
	}

	/**
	 * Register an action in a local server
	 * 
	 * @param {any} service
	 * @param {any} action
	 * 
	 * @memberOf ServiceBroker
	 */
	registerAction(service, action) {
		// Append action by name
		let item = this.actions.get(action.name);
		if (!item) {
			item = new BalancedList();
			this.actions.set(action.name, item);
		}
		item.add(action);
		bus.emit(`register.action.${action.name}`, service, action);
	}

	subscribeEvent(service, event) {
		// Append event subscriptions
		let item = this.subscriptions.get(event.name);
		if (!item) {
			item = new BalancedList();
			this.subscriptions.set(event.name, item);
		}
		item.add(event);
		bus.on(event.name, event.handler.bind(service));
	}

	getService(serviceName) {
		let service = this.services.get(serviceName);
		if (service) {
			return service.get();
		}
	}

	hasService(serviceName) {
		return this.services.has(serviceName);
	}

	hasAction(actionName) {
		return this.actions.has(actionName);
	}

	call(actionName, params, parentCtx) {
		let actions = this.actions.get(actionName);
		if (!actions)
			throw new errors.ServiceNotFoundError(`Missing action '${actionName}'!`);
		
		let action = actions.get();
		/* istanbul ignore next */
		if (!action)
			throw new Error(`Missing action handler '${actionName}'!`);

		let service = action.service;
		// Create a new context
		let ctx;
		if (parentCtx) 
			ctx = parentCtx.createSubContext(service, action, params);
		else
			ctx = new Context({ service, action, params });
		
		return action.handler(ctx);
	}

	emit(eventName, data) {
		if (this.transporter)
			this.transporter.emit(eventName, data);
		return this.emitLocal(eventName, data);
	}

	emitLocal(eventName, data) {
		let d;
		if (_.isObject(data))
			d = Object.freeze(Object.assign({}, data));
		else
			d = data;

		return bus.emit(eventName, d);
	}

	getLocalActionList() {
		let res = [];
		for (let entry of this.actions.entries()) {
			if (entry[1].hasLocal())
				res.push(entry[0]);
		}
		return res;
	}
	/*
	publishActionList() {
		if (this.transporter) {
			this.transporter.publishActionList();
		}
	}*/
}

module.exports = ServiceBroker;