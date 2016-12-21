"use strict";

let EventEmitter2 = require("eventemitter2").EventEmitter2;
let BalancedList = require("./balanced-list");
let Context = require("./context");
let errors = require("./errors");
let utils = require("./utils");
let _ = require("lodash");


class ServiceBroker {

	constructor(options) {
		this.options = options || {};
		this.nodeID = this.options.nodeID || utils.getNodeID();

		this.logger = this.getLogger(this.nodeID);
		this.bus = new EventEmitter2({
			wildcard: true,
			maxListeners: 100,
		});
		this.bus.onAny((event, value) => {
			this.logger.debug("Local event", event, value);
		});		

		this.nodes = new Map();
		this.services = new Map();
		this.actions = new Map();
		this.subscriptions = new Map();
		this.transporter = this.options.transporter;
		this.cacher = this.options.cacher;

		if (this.cacher) {
			this.cacher.init(this);
		}

		if (this.transporter) {
			this.transporter.init(this);
		}
	}

	start() {
		if (this.transporter) {
			this.transporter.connect();
		}
	}

	getLogger(module) {
		let noop = function() {};
		let extLogger = this.options.logger;

		let prefix = "[" + this.nodeID + (module ? "-" + module : "") + "] ";

		let logger = {};
		["log", "error", "warn", "info", "debug"].forEach(type => logger[type] = noop);

		if (extLogger) {
			["log", "error", "warn", "info", "debug"].forEach(type => {
				let externalMethod = extLogger[type] || extLogger.info || extLogger.log;
				if (externalMethod) {
					logger[type] = function(msg, ...args) {
						externalMethod(prefix + msg, ...args);
					}.bind(extLogger);
				}
			});
		}

		return logger;
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

		this.emitLocal(`register.service.${service.name}`, { service });
	}

	/**
	 * Register an action in a local server
	 * 
	 * @param {any} service
	 * @param {any} action
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
		item.add(action, 0, nodeID);
		this.emitLocal(`register.action.${action.name}`, { service, action });
	}

	on(name, handler) {
		this.bus.on(name, handler);
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
		
		let actionItem = actions.get();
		/* istanbul ignore next */
		if (!actionItem)
			throw new Error(`Missing action handler '${actionName}'!`);

		if (actionItem.local) {
			// Local action call
			let action = actionItem.data;
			let service = action.service;
			// Create a new context
			let ctx;
			if (parentCtx) 
				ctx = parentCtx.createSubContext(service, action, params);
			else
				ctx = new Context({ service, action, params });
			
			return action.handler(ctx);

		} else if (actionItem.nodeID && this.transporter) {
			let requestID = parentCtx ? parentCtx.id : utils.generateToken();
			return this.transporter.request(actionItem.nodeID, requestID, actionName, params);
		} else {
			throw new Error(`No action handler for '${actionName}'!`);
		}
	}

	emit(eventName, ...args) {
		if (this.transporter)
			this.transporter.emit(eventName, ...args);

		return this.emitLocal(eventName, ...args);
	}

	emitLocal(eventName, ...args) {
		return this.bus.emit(eventName, ...args);
	}

	getLocalActionList() {
		let res = [];
		for (let entry of this.actions.entries()) {
			if (entry[1].hasLocal())
				res.push(entry[0]);
		}
		return res;
	}
	
	processNodeInfo(info) {
		if (info.actions) {
			info.actions.forEach(name => {
				let action = {
					name
				};

				this.registerAction(null, action, info.nodeID);
			});
		}
		//console.log(`[${this.nodeID}] `, this.actions);
	}
}

module.exports = ServiceBroker;