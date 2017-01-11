/*
 * ice-services
 * Copyright (c) 2017 Norbert Mereg (https://github.com/icebob/ice-services)
 * MIT Licensed
 */

"use strict";

const Promise = require("bluebird");
const EventEmitter2 = require("eventemitter2").EventEmitter2;
const BalancedList = require("./balanced-list");
const errors = require("./errors");
const utils = require("./utils");
const Logger = require("./logger");

const _ = require("lodash");
const glob = require("glob");
const path = require("path");

// global.Promise = require("bluebird");


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
			metrics: false,
			logLevel: "info"
		});

		this.ServiceFactory = this.options.ServiceFactory ? this.options.ServiceFactory : require("./service");
		this.ContextFactory = this.options.ContextFactory ? this.options.ContextFactory : require("./context");

		this.nodeID = this.options.nodeID || utils.getNodeID();

		this._loggerCache = {};
		this.logger = this.getLogger("BROKER");
		
		this.bus = new EventEmitter2({
			wildcard: true,
			maxListeners: 100
		});

		this.nodes = new Map();
		this.services = new Map();
		this.actions = new Map();

		this.middlewares = [];

		this.cacher = this.options.cacher;
		if (this.cacher) {
			this.cacher.init(this);
		}

		this.transporter = this.options.transporter;
		if (this.transporter) {
			this.transporter.init(this);
		}

		this._callCount = 0;
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
	 * Register a new plugin
	 * 
	 * @param {any} plugin
	 * 
	 * @memberOf ServiceBroker
	 */
	plugin(plugin) {
		this.plugins.push(plugin);
	}

	/**
	 * Call a method in every registered plugins
	 * 
	 * @param {any} target		Target of call (value of this)
	 * @param {any} method		Method name
	 * @param {any} args		Arguments to method
	 * 
	 * @memberOf ServiceBroker
	 */
	callPluginMethod(method, ...args) {
		if (this.plugins.length == 0) return;

		this.plugins.forEach(plugin => {
			if (_.isFunction(plugin[method])) {
				plugin[method].call(plugin, ...args);
			}
		});
	}

	/**
	 * Start broker. If set transport, transport.connect will be called.
	 * 
	 * @memberOf ServiceBroker
	 */
	start() {
		this.callPluginMethod("starting", this);

		// Call service `started` handlers
		this.services.forEach(item => {
			let service = item.get().data;
			this.callPluginMethod("serviceStarted", this, service);

			if (service && service.schema && _.isFunction(service.schema.started)) {
				service.schema.started.call(service);
			}
		});

		this.callPluginMethod("started", this);

		if (this.transporter) {
			return this.transporter.connect().then(() => {
				
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
		else
			return Promise.resolve();
	}

	/**
	 * Stop broker. If set transport, transport.disconnect will be called.
	 * 
	 * 
	 * @memberOf ServiceBroker
	 */
	stop() {
		this.callPluginMethod("stopping", this);

		// Call service `started` handlers
		this.services.forEach(item => {
			let service = item.get().data;
			this.callPluginMethod("serviceStopped", this, service);

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

		this.callPluginMethod("stopped", this);
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
		let logger = this._loggerCache[name];
		if (logger)
			return logger;

		// return utils.wrapLogger(this.options.logger, this.nodeID + (name ? "-" + name : ""));
		logger = Logger.wrap(this.options.logger, name, this.options.logLevel);
		this._loggerCache[name] = logger;

		return logger;
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
		let fName = path.resolve(filePath);
		this.logger.debug("Load service from", path.basename(fName));
		let schema = require(fName);
		if (_.isFunction(schema)) {
			let svc = schema(this);
			if (svc instanceof this.ServiceFactory)
				return svc;
			else
				return new this.ServiceFactory(this, svc);

		} else {
			return new this.ServiceFactory(this, schema);
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
	 * Subscribe to an event once
	 * 
	 * @param {any} name
	 * @param {any} handler
	 * 
	 * @memberOf ServiceBroker
	 */
	once(name, handler) {
		this.bus.once(name, handler);
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
	 * Add a middleware to the broker
	 * 
	 * @param {any} mw
	 * 
	 * @memberOf ServiceBroker
	 */
	use(...mws) {
		mws.forEach(mw => {
			if (mw)
				this.middlewares.push(mw);
		});
	}

	// Függvény ami a meghívja a következő middleware-t
	__runNextMiddleware(ctx, next, masterNext, mwIndex) {
		// Ha már nincs következő middleware, akkor a masterNext függvényt hívjuk
		if (this.middlewares.length == mwIndex) {
			let res = masterNext(ctx);
			return !utils.isPromise(res) ? Promise.resolve(res) : res;
		}

		// Következő middleware lekérése
		let mw = this.middlewares[mwIndex++];
		
		// Middleware kód meghívása és next függvény generálása a folytatáshoz.
		try {
			return mw(ctx, next);
		} catch(err) {
			return Promise.reject(err);
		}
	}	

	/**
	 * Call middlewares with context
	 * 
	 * @param {Context} 	ctx			Context
	 * @param {Function} 	masterNext	Master function after invoked middlewares
	 * @returns {Promise}
	 * 
	 * @memberOf ServiceBroker
	 */
	callMiddlewares(ctx, masterNext) {
		let self = this;

		// Ha nincs regisztrált middleware egyből meghívjuk a master kódot
		if (this.middlewares.length == 0) return masterNext(ctx);

		// Beállítjuk az indexet
		let mwIndex = 0;

		// A következő middleware hívásához használt függvény. Ezt hívják meg a middleware-ből
		// ha végeztek a dolgukkal. Ez egy Promise-t ad vissza, amihez .then-t írhatnak
		// ami pedig akkor hívódik meg, ha a masterNext lefutott.
		function next(p) {
			// Ha Promise-t adott vissza a middleware hívás akkor csak ha 'resolved' lesz, akkor hívjuk meg a következőt
			if (p && utils.isPromise(p)) {
				return p.then(res => {
					// Ha eredménnyel tért vissza, akkor azt jelenti, hogy 
					// nem kell több middleware-t hívni, egyből visszaadjuk az eredményt
					// Pl: cache-ben megvolt az adat.
					if (res)
						return res;

					return self.__runNextMiddleware(ctx, next, masterNext, mwIndex++);
				});
			} else {
				// Ha nem, akkor közvetlenül
				return self.__runNextMiddleware(ctx, next, masterNext, mwIndex++);
			}
		}

		// Első middleware meghívása
		return Promise.resolve(next());
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
		let actions = this.actions.get(actionName);
		if (!actions) {
			return Promise.reject(new errors.ServiceNotFoundError(`Missing '${actionName}' action!`));
		}
		
		let actionItem = actions.get();
		/* istanbul ignore next */
		if (!actionItem) {
			return Promise.reject(new Error(`Missing '${actionName}' action handler!`));
		}

		let action = actionItem.data;
		let nodeID = actionItem.nodeID;

		// Create a new context
		let ctx;
		if (parentCtx) {
			ctx = parentCtx.createSubContext(action, params, nodeID);
		} else {
			ctx = new this.ContextFactory({ broker: this, action, params, requestID });
		}
		this._callCount++;

		if (actionItem.local) {
			// Local action call
			this.logger.debug(`Call local '${action.name}' action...`);
			return ctx.invoke(() => {
				return this.callMiddlewares(ctx, action.handler);
			});
		} else {
			// Remote action call
			this.logger.debug(`Call remote '${action.name}' action in node '${nodeID}'...`);
			return ctx.invoke(() => {
				return this.callMiddlewares(ctx, () => {
					return this.transporter.request(nodeID, ctx);
				});
			});
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