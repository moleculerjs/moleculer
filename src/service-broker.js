/*
 * ice-services
 * Copyright (c) 2016 Norbert Mereg (https://github.com/icebob/ice-services)
 * MIT Licensed
 */

"use strict";

let EventEmitter2 = require("eventemitter2").EventEmitter2;
let BalancedList = require("./balanced-list");
let Context = require("./context");
let errors = require("./errors");
let utils = require("./utils");
let _ = require("lodash");
let glob = require("glob");
let path = require("path");


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
		this.options = _.defaultsDeep(options, {
			sendHeartbeatTime: 10,
			nodeHeartbeatTimeout: 30,
			metrics: false
		});

		this.nodeID = this.options.nodeID || utils.getNodeID();

		this.logger = this.getLogger("BROKER");
		this.bus = new EventEmitter2({
			wildcard: true,
			maxListeners: 100
		});

		this.nodes = new Map();
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

		this.plugins = [];		

		this._closeFn = () => {
			this.stop();
		};

		process.setMaxListeners(0);
		process.on("beforeExit", this._closeFn);
		process.on("exit", this._closeFn);
		process.on("SIGINT", this._closeFn);
	}

	/**
	 * Call a method in every registered plugin
	 * 
	 * @param {any} target		Target of call (value of this)
	 * @param {any} method		Method name
	 * @param {any} args		Arguments to method
	 * 
	 * @memberOf ServiceBroker
	 */
	_callPluginMethod(target, method, ...args) {
		if (this.plugins.length == 0) return;

		this.plugins.forEach(plugin => {
			if (_.isFunction(plugin[method])) {
				plugin[method].call(target, ...args);
			}
		});
	}

	/**
	 * Start broker. If set transport, transport.connect will be called.
	 * 
	 * @memberOf ServiceBroker
	 */
	start() {
		this._callPluginMethod(this, "starting");

		// Call service `started` handlers
		this.services.forEach(item => {
			let service = item.get().data;
			this._callPluginMethod(service, "serviceStarted");

			if (service && service.schema && _.isFunction(service.schema.started)) {
				service.schema.started.call(service);
			}
		});

		if (this.transporter) {
			this.transporter.connect().then(() => {
				
				// Start timers
				this.heartBeatTimer = setInterval(() => {
					/* istanbul ignore next */
					this.transporter.sendHeartbeat();
				}, this.options.sendHeartbeatTime * 1000);
				this.heartBeatTimer.unref();

				this.checkNodesTimer = setInterval(() => {
					/* istanbul ignore next */
					this.checkRemoteNodes();
				}, this.options.nodeHeartbeatTimeout * 1000);
				this.checkNodesTimer.unref();			
			});
		}

		this._callPluginMethod(this, "started");
	}

	/**
	 * Stop broker. If set transport, transport.disconnect will be called.
	 * 
	 * 
	 * @memberOf ServiceBroker
	 */
	stop() {
		this._callPluginMethod(this, "stopping");

		// Call service `started` handlers
		this.services.forEach(item => {
			let service = item.get().data;
			this._callPluginMethod(service, "serviceStopped");

			if (service && service.schema && _.isFunction(service.schema.stopped)) {
				service.schema.stopped.call(service);
			}
		});
		
		if (this.transporter) {
			this.transporter.disconnect();

			if (this.heartBeatTimer) {
				clearInterval(this.heartBeatTimer);
				this.heartBeatTimer = null;
			}

			if (this.checkNodesTimer) {
				clearInterval(this.checkNodesTimer);
				this.checkNodesTimer = null;
			}
		}

		process.removeListener("beforeExit", this._closeFn);
		process.removeListener("exit", this._closeFn);
		process.removeListener("SIGINT", this._closeFn);

		this._callPluginMethod(this, "stopped");
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
		// return utils.wrapLogger(this.options.logger, this.nodeID + (name ? "-" + name : ""));
		return utils.wrapLogger(this.options.logger, name);
	}

	/**
	 * Load services from a folder
	 * 
	 * @param {string} [folder="./services"]		Folder of services
	 * @param {string} [fileMask="*.service.js"]	Service filename mask
	 * @returns	{Number}							Number of found services
	 * 
	 * @memberOf ServiceBroker
	 */
	loadServices(folder = "./services", fileMask = "*.service.js") {
		this.logger.debug(`Load services from ${fileMask}...`); 
		
		let serviceFiles = glob.sync(path.join(folder, fileMask));
		if (serviceFiles) {
			serviceFiles.forEach(servicePath => {
				this.loadService(servicePath);
			});
		}	
		return serviceFiles.length;	
	}

	/**
	 * Load a service from file
	 * 
	 * @param {string} 		Path of service
	 * @returns	{Service}	Loaded service
	 * 
	 * @memberOf ServiceBroker
	 */
	loadService(filePath) {
		let Service = require("./service");		
		let fName = path.resolve(filePath);
		this.logger.debug("Load service from", path.basename(fName));
		let schema = require(fName);
		if (_.isFunction(schema)) {
			let svc = schema(this);
			if (svc instanceof Service)
				return svc;
			else
				return new Service(this, svc);

		} else {
			return new Service(this, schema);
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
			this.emitLocal(`register.action.${action.name}`, service, action, nodeID);
		}
	}

	/**
	 * Unregister an action on a local server. 
	 * It will be called when a remote node disconnected. 
	 * 
	 * @param {any} service		service of action
	 * @param {any} action		action schema
	 * @param {any} nodeID		NodeID if it is on a remote server/node
	 * 
	 * @memberOf ServiceBroker
	 */
	unregisterAction(service, action, nodeID) {
		let item = this.actions.get(action.name);
		if (item) {
			item.removeByNode(nodeID);
			if (item.count() == 0) {
				this.actions.delete(action.name);
			}
			this.emitLocal(`unregister.action.${action.name}`, service, action, nodeID);
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
	 * Unsubscribe from an event
	 * 
	 * @param {any} name
	 * @param {any} handler
	 * 
	 * @memberOf ServiceBroker
	 */
	off(name, handler) {
		this.bus.off(name, handler);
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
	 * @param {any} requestID	requestID (optional)
	 * @returns
	 * 
	 * @memberOf ServiceBroker
	 */
	call(actionName, params, parentCtx, requestID) {
		return Promise.resolve().then(() => {

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

			// Create a new context
			let ctx;
			if (parentCtx) {
				ctx = parentCtx.createSubContext(action, params);
			} else {
				ctx = new Context({ broker: this, action, params, requestID });
			}

			if (actionItem.local) {
				// Local action call
				this.logger.debug(`Call local '${action.name}' action...`);

				return ctx.invoke(action.handler);

			} else if (actionItem.nodeID && this.transporter) {
				// Remote action call
				this.logger.debug(`Call remote '${action.name}' action in node '${actionItem.nodeID}'...`);

				return this.transporter.request(actionItem.nodeID, ctx);

			} else {
				/* istanbul ignore next */
				throw new Error(`No action handler for '${actionName}'!`);
			}

		});
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

		this.logger.debug("Local event", eventName, ...args);		

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
	processNodeInfo(nodeID, info) {
		let isNewNode = !this.nodes.has(nodeID);
		info.lastHeartbeatTime = Date.now();
		this.nodes.set(info.nodeID, info);

		if (isNewNode) {
			this.emitLocal(`register.node.${nodeID}`, info);
		}

		if (info.actions) {
			// Add external actions
			info.actions.forEach(name => {
				let action = { name };

				this.registerAction(null, action, info.nodeID);
			});
		}
	}

	/**
	 * Save a heart-beat time from a remote node
	 * 
	 * @param {any} nodeID
	 * 
	 * @memberOf ServiceBroker
	 */
	nodeHeartbeat(nodeID) {
		if (this.nodes.has(nodeID)) {
			let info = this.nodes.get(nodeID);
			info.lastHeartbeatTime = Date.now();
		}
	}

	/**
	 * Node disconnected event handler. 
	 * Remove node and remove remote actions of node
	 * 
	 * @param {any} nodeID
	 * 
	 * @memberOf ServiceBroker
	 */
	nodeDisconnected(nodeID) {
		if (this.nodes.has(nodeID)) {
			let info = this.nodes.get(nodeID);

			if (info.actions) {
				// Add external actions
				info.actions.forEach(name => {
					let action = { name };
					this.unregisterAction(null, action, info.nodeID);
				});
			}

			this.emitLocal(`unregister.node.${nodeID}`, info);
			this.nodes.delete(nodeID);
		}
	}

	/**
	 * Check all registered remote nodes is live.
	 * 
	 * @memberOf ServiceBroker
	 */
	checkRemoteNodes() {
		let now = Date.now();
		for (let entry of this.nodes.entries()) {
			if (now - (entry[1].lastHeartbeatTime || 0) > this.options.nodeHeartbeatTimeout * 1000) {
				this.nodeDisconnected(entry[0]);
			}
		}
	}

	metricsEnabled() {
		return this.options.metrics;
	}
}

module.exports = ServiceBroker;