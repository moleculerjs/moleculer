"use strict";

let EventEmitter2 = require("eventemitter2").EventEmitter2;
let BalancedList = require("./balanced-list");
let Context = require("./context");
let errors = require("./errors");
let utils = require("./utils");
let _ = require("lodash");


/**
 * Service broker class
 * 
 * @class ServiceBroker
 */
class ServiceBroker {

	/**
	 * Creates an instance of ServiceBroker.
	 * 
	 * @param {any} options
	 * 
	 * @memberOf ServiceBroker
	 */
	constructor(options) {
		this.options = options || {};
		this.nodeID = this.options.nodeID || utils.getNodeID();

		this.logger = this.getLogger("BKR");
		this.bus = new EventEmitter2({
			wildcard: true,
			maxListeners: 100,
		});
		// TODO debug
		this.bus.onAny((event, value) => {
			this.logger.debug("Local event", event, value);
		});		

		this.services = new Map();
		this.actions = new Map();

		this.cacher = this.options.cacher;
		if (this.cacher) {
			this.cacher.init(this);
		}

		this.transporter = this.options.transporter;
		if (this.transporter) {
			this.transporter.init(this);
		}
	}

	/**
	 * Start broker. If set transport, transport.connect will be called.
	 * 
	 * @memberOf ServiceBroker
	 */
	start() {
		if (this.transporter) {
			this.transporter.connect();
		}
	}

	/**
	 * Get a custom logger for sub-modules (service, transporter, cacher, context...etc)
	 * 
	 * @param {String} name	name of module
	 * @returns
	 * 
	 * @memberOf ServiceBroker
	 */
	getLogger(name) {
		return utils.wrapLogger(this.options.logger, this.nodeID + (name ? "-" + name : ""));
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

		this.emitLocal(`register.service.${service.name}`, service);
	}

	/**
	 * Register an action in a local server
	 * 
	 * @param {any} service		service of action
	 * @param {any} action		action schema
	 * @param {any} nodeID		NodeID if it is on a remote server/node
	 * 
	 * @memberOf ServiceBroker
	 */
	registerAction(service, action, nodeID) {
		// Append action by name
		let item = this.actions.get(action.name);
		if (!item) {
			item = new BalancedList();
			this.actions.set(action.name, item);
		}
		if (item.add(action, 0, nodeID)) {
			this.emitLocal(`register.action.${action.name}`, service, action);
		}
	}

	/**
	 * Subscribe to an event
	 * 
	 * @param {any} name
	 * @param {any} handler
	 * 
	 * @memberOf ServiceBroker
	 */
	on(name, handler) {
		this.bus.on(name, handler);
	}

	/**
	 * Get a local service by name
	 * 
	 * @param {any} serviceName
	 * @returns
	 * 
	 * @memberOf ServiceBroker
	 */
	getService(serviceName) {
		let service = this.services.get(serviceName);
		if (service) {
			return service.get();
		}
	}

	/**
	 * Has a local service by name
	 * 
	 * @param {any} serviceName
	 * @returns
	 * 
	 * @memberOf ServiceBroker
	 */
	hasService(serviceName) {
		return this.services.has(serviceName);
	}

	/**
	 * Has an action by name
	 * 
	 * @param {any} actionName
	 * @returns
	 * 
	 * @memberOf ServiceBroker
	 */
	hasAction(actionName) {
		return this.actions.has(actionName);
	}

	/**
	 * Call an action (local or global)
	 * 
	 * @param {any} actionName	name of action
	 * @param {any} params		params of action
	 * @param {any} parentCtx	parent context (optional)
	 * @returns
	 * 
	 * @memberOf ServiceBroker
	 */
	call(actionName, params, parentCtx) {
		let actions = this.actions.get(actionName);
		if (!actions) {
			throw new errors.ServiceNotFoundError(`Missing action '${actionName}'!`);
		}
		
		let actionItem = actions.get();
		/* istanbul ignore next */
		if (!actionItem) {
			throw new Error(`Missing action handler '${actionName}'!`);
		}

		let action = actionItem.data;
		let service = action.service;

		// Create a new context
		let ctx;
		if (parentCtx) {
			ctx = parentCtx.createSubContext(service, action, params);
		} else {
			ctx = new Context({ service, action, params });
		}
			
		if (actionItem.local) {
			// Local action call
			return action.handler(ctx);

		} else if (actionItem.nodeID && this.transporter) {
			// Remote action call
			return this.transporter.request(actionItem.nodeID, ctx);

		} else {
			/* istanbul ignore next */
			throw new Error(`No action handler for '${actionName}'!`);
		}
	}

	/**
	 * Emit an event (global & local)
	 * 
	 * @param {any} eventName
	 * @param {any} args
	 * @returns
	 * 
	 * @memberOf ServiceBroker
	 */
	emit(eventName, ...args) {
		if (this.transporter) {
			this.transporter.emit(eventName, ...args);
		}

		return this.emitLocal(eventName, ...args);
	}

	/**
	 * Emit an event only local
	 * 
	 * @param {any} eventName
	 * @param {any} args
	 * @returns
	 * 
	 * @memberOf ServiceBroker
	 */
	emitLocal(eventName, ...args) {
		return this.bus.emit(eventName, ...args);
	}

	/**
	 * Get a list of names of local actions
	 * 
	 * @returns
	 * 
	 * @memberOf ServiceBroker
	 */
	getLocalActionList() {
		let res = [];
		for (let entry of this.actions.entries()) {
			if (entry[1].hasLocal()) {
				res.push(entry[0]);
			}
		}
		return res;
	}
	
	/**
	 * Process remote node info (list of actions)
	 * 
	 * @param {any} info
	 * 
	 * @memberOf ServiceBroker
	 */
	processNodeInfo(info) {
		if (info.actions) {
			// Add external actions
			info.actions.forEach(name => {
				let action = {
					name
				};

				this.registerAction(null, action, info.nodeID);
			});
		}
	}
}

module.exports = ServiceBroker;