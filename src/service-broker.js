/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const Promise = require("bluebird");
const EventEmitter2 = require("eventemitter2").EventEmitter2;
const Transit = require("./transit");
const BalancedList = require("./balanced-list");
const errors = require("./errors");
const utils = require("./utils");
const Logger = require("./logger");
const Validator = require("./validator");
const BrokerStatistics = require("./statistics");
const healthInfo = require("./health");

//const _ = require("lodash");
const isFunction = require("lodash/isFunction");
const defaultsDeep = require("lodash/defaultsDeep");
const pick = require("lodash/pick");
const omit = require("lodash/omit");
const isArray = require("lodash/isArray");

const glob = require("glob");
const path = require("path");


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
		this.options = defaultsDeep(options, {
			nodeID: null,

			logger: null,
			logLevel: "info",

			transporter: null,
			requestTimeout: 15 * 1000,
			requestRetry: 0,
			sendHeartbeatTime: 10,
			nodeHeartbeatTimeout: 30,

			cacher: null,

			validation: true,
			metrics: false,
			metricsNodeTime: 5 * 1000,
			statistics: false,
			internalActions: true
			
			// ServiceFactory: null,
			// ContextFactory: null
		});

		// Class factories
		this.ServiceFactory = this.options.ServiceFactory || require("./service");
		this.ContextFactory = this.options.ContextFactory || require("./context");

		// Self nodeID
		this.nodeID = this.options.nodeID || utils.getNodeID();

		// Logger
		this._loggerCache = {};
		this.logger = this.getLogger("BROKER");

		// Local event bus
		this.bus = new EventEmitter2({
			wildcard: true,
			maxListeners: 100
		});

		// Internal maps
		this.nodes = new Map();
		this.services = [];
		this.actions = new Map();

		// Middlewares
		this.middlewares = [];

		// Cacher
		this.cacher = this.options.cacher;
		if (this.cacher) {
			this.cacher.init(this);
		}

		// Validation
		if (this.options.validation !== false) {
			this.validator = new Validator();
			if (this.validator) {
				this.validator.init(this);
			}
		}

		// Transit
		if (this.options.transporter) {
			this.transit = new Transit(this, this.options.transporter);
		}

		// TODO remove to stats
		this._callCount = 0;

		if (this.options.statistics)
			this.statistics = new BrokerStatistics(this);

		this.getNodeHealthInfo = healthInfo;

		// Register internal actions
		if (this.options.internalActions)
			this.registerInternalActions();

		// Graceful exit
		this._closeFn = () => {
			/* istanbul ignore next */
			this.stop();
		};

		process.setMaxListeners(0);
		process.on("beforeExit", this._closeFn);
		process.on("exit", this._closeFn);
		process.on("SIGINT", this._closeFn);
	}

	/**
	 * Start broker. If set transport, transport.connect will be called.
	 * 
	 * @memberOf ServiceBroker
	 */
	start() {
		// Call service `started` handlers
		this.services.forEach(service => {
			if (service && service.schema && isFunction(service.schema.started)) {
				service.schema.started.call(service);
			}
		});

		if (this.options.metrics && this.options.metricsNodeTime > 0) {
			this.metricsTimer = setInterval(() => {
				// Send event with node health info
				this.getNodeHealthInfo().then(data => this.emit("metrics.node.health", data));

				// Send event with node statistics
				if (this.statistics)
					this.emit("metrics.node.stats", this.statistics.snapshot());
			}, this.options.metricsNodeTime);
			this.metricsTimer.unref();
		}

		this.logger.info("Broker started.");

		if (this.transit) {
			return this.transit.connect().then(() => {
				
				// Start timers
				this.heartBeatTimer = setInterval(() => {
					/* istanbul ignore next */
					this.transit.sendHeartbeat();
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
		// Call service `started` handlers
		this.services.forEach(service => {
			if (service && service.schema && isFunction(service.schema.stopped)) {
				service.schema.stopped.call(service);
			}
		});

		if (this.metricsTimer) {
			clearInterval(this.metricsTimer);
			this.metricsTimer = null;
		}
		
		if (this.transit) {
			this.transit.disconnect();

			if (this.heartBeatTimer) {
				clearInterval(this.heartBeatTimer);
				this.heartBeatTimer = null;
			}

			if (this.checkNodesTimer) {
				clearInterval(this.checkNodesTimer);
				this.checkNodesTimer = null;
			}
		}

		this.logger.info("Broker stopped.");

		process.removeListener("beforeExit", this._closeFn);
		process.removeListener("exit", this._closeFn);
		process.removeListener("SIGINT", this._closeFn);
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
		this.logger.info(`Search services in '${folder}/${fileMask}'...`); 
		
		let serviceFiles;

		if (isArray(fileMask))
			serviceFiles = fileMask.map(f => path.join(folder, f));
		else
			serviceFiles = glob.sync(path.join(folder, fileMask));

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
		this.logger.debug(`Load service from '${path.basename(fName)}'...`);
		let schema = require(fName);
		if (isFunction(schema)) {
			let svc = schema(this);
			if (svc instanceof this.ServiceFactory)
				return svc;
			else
				return this.createService(svc);

		} else {
			return this.createService(schema);
		}
	}

	/**
	 * Create a new service by schema
	 * 
	 * @param {any} schema	Schema of service
	 * @returns {Service}
	 * 
	 * @memberOf ServiceBroker
	 */
	createService(schema) {
		let service = new this.ServiceFactory(this, schema);
		return service;
	}

	/**
	 * Register a local service
	 * 
	 * @param {any} service
	 * 
	 * @memberOf ServiceBroker
	 */
	registerService(service) {
		// Append service
		this.services.push(service);
		this.emitLocal(`register.service.${service.name}`, service);
		this.logger.info(`'${service.name}' service is registered!`);
	}

	/**
	 * Register an action in a local server
	 * 
	 * @param {any} action		action schema
	 * @param {any} nodeID		NodeID if it is on a remote server/node
	 * 
	 * @memberOf ServiceBroker
	 */
	registerAction(action, nodeID) {

		// Wrap middlewares
		if (!nodeID)
			this.wrapAction(action);
		
		// Append action by name
		let item = this.actions.get(action.name);
		if (!item) {
			item = new BalancedList();
			this.actions.set(action.name, item);
		}
		if (item.add(action, nodeID)) {
			this.emitLocal(`register.action.${action.name}`, { action, nodeID });
		}
	}

	/**
	 * Wrap action handler for middlewares
	 * 
	 * @param {any} action
	 * 
	 * @memberOf ServiceBroker
	 */
	wrapAction(action) {
		let handler = action.handler;
		if (this.middlewares.length) {
			let mws = Array.from(this.middlewares);
			handler = mws.reduce((handler, mw) => {
				return mw(handler, action);
			}, handler);
		}

		return this.wrapContextInvoke(action, handler);
	}

	wrapContextInvoke(action, handler) {
		// Finally logic
		let after = (ctx, err) => {
			if (this.options.metrics)
				ctx._metricFinish(err);

			if (this.statistics)
				this.statistics.addRequest(ctx.action.name, ctx.duration, err ? err.code || 500 : null);
		};

		// Add the main wrapper
		action.handler = (ctx) => {
			// Add metrics start
			if (this.options.metrics)
				ctx._metricStart();

			// Call the handler
			let p = handler(ctx);
			
			if (this.options.metrics || this.statistics) {
				// Add after to metrics & statistics
				p = p.then(res => {
					after(ctx, null);
					return res;
				});
			}

			// Handle errors
			return p.catch(err => {
				if (!(err instanceof Error)) {
					err = new errors.CustomError(err);
				}

				this.logger.error("Action request error!", err);

				//ctx.error = err;
				err.ctx = ctx;

				after(ctx, err);

				return Promise.reject(err);
			});
		};

		return action;
	}

	/**
	 * Unregister an action on a local server. 
	 * It will be called when a remote node disconnected. 
	 * 
	 * @param {any} action		action schema
	 * @param {any} nodeID		NodeID if it is on a remote server/node
	 * 
	 * @memberOf ServiceBroker
	 */
	unregisterAction(action, nodeID) {
		let item = this.actions.get(action.name);
		if (item) {
			item.removeByNode(nodeID);
			/* Nem töröljük, mert valószínűleg csak leszakadt a node és majd vissza fog jönni.
			   Tehát az action létezik, csak pillanatnyilag nem elérhető
			
			if (item.count() == 0) {
				this.actions.delete(action.name);
			}
			this.emitLocal(`unregister.action.${action.name}`, { service, action, nodeID });
			*/
		}		
	}

	/**
	 * Register internal actions
	 * 
	 * @memberOf ServiceBroker
	 */
	registerInternalActions() {
		const addAction = (name, handler) => {
			this.registerAction({
				name,
				cache: false,
				handler: Promise.method(handler)
			});
		};

		addAction("$node.list", () => {
			let res = [];
			this.nodes.forEach(node => {
				res.push(pick(node, ["nodeID", "available"]));
			});

			return res;
		});

		addAction("$node.services", () => {
			let res = [];
			this.services.forEach(service => {
				res.push(pick(service, ["name", "version"]));
			});

			return res;
		});

		addAction("$node.actions", () => {
			let res = [];
			this.actions.forEach((o, name) => {
				let item = o.getLocalItem();
				if (item) {
					res.push({
						name
					});
				}
			});

			return res;
		});

		addAction("$node.health", () => this.getNodeHealthInfo());

		if (this.statistics) {
			addAction("$node.stats", () => {
				return this.statistics.snapshot();
			});		
			
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
		return this.services.find(service => service.name == serviceName);
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
		return this.services.find(service => service.name == serviceName) != null;
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
	 * Check has available action handler
	 * 
	 * @param {any} actionName
	 * @returns
	 * 
	 * @memberOf ServiceBroker
	 */
	isActionAvailable(actionName) {
		let action = this.actions.get(actionName);
		return action && action.count() > 0;
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

	/**
	 * Call an action (local or global)
	 * 
	 * @param {any} actionName	name of action
	 * @param {any} params		params of action
	 * @param {any} opts		options of call (optional)
	 * @returns
	 * 
	 * @memberOf ServiceBroker
	 */
	call(actionName, params, opts = {}) {
		let actions = this.actions.get(actionName);
		if (!actions) {
			const errMsg = `Action '${actionName}' is not registered!`;
			this.logger.warn(errMsg);
			return Promise.reject(new errors.ServiceNotFoundError(errMsg));
		}
		
		let actionItem = actions.get();
		if (!actionItem) {
			const errMsg = `Not available '${actionName}' action handler!`;
			this.logger.warn(errMsg);
			return Promise.reject(new errors.ServiceNotFoundError(errMsg));
		}

		let action = actionItem.data;
		let nodeID = actionItem.nodeID;

		// Create a new context
		let ctx;
		if (opts.parentCtx) {
			ctx = opts.parentCtx.createSubContext(action, params, nodeID);
		} else {
			ctx = new this.ContextFactory({ broker: this, action, params, nodeID, requestID: opts.requestID, metrics: !!this.options.metrics });
		}

		this._callCount++; // Need to remove

		if (actionItem.local) {
			// Local action call
			this.logger.info(`Call local '${action.name}' action...`);
			return action.handler(ctx);
		} else {
			return this._remoteCall(ctx, opts);
		}
	}

	_remoteCall(ctx, opts = {}) {		
		// Remote action call
		this.logger.info(`Call remote '${ctx.action.name}' action on '${ctx.nodeID}' node...`);

		if (opts.timeout == null)
			opts.timeout = this.options.requestTimeout;

		if (opts.retryCount == null)
			opts.retryCount = this.options.requestRetry || 0;

		return this.transit.request(ctx, opts).catch(err => this._remoteCallCather(err, ctx, opts));
	}

	_remoteCallCather(err, ctx, opts) {
		if (err instanceof errors.RequestTimeoutError) {
			// Retry request
			if (opts.retryCount-- > 0) {
				this.logger.warn(`Retry call '${ctx.action.name}' action on '${ctx.nodeID}' (retry: ${opts.retryCount + 1})...`);

				return this.call(ctx.action.name, ctx.params, opts);
			}

			this.nodeUnavailable(ctx.nodeID);
		}
		// Handle fallback response
		if (opts.fallbackResponse) {
			this.logger.warn(`Action '${ctx.action.name}' returns fallback response!`);
			if (isFunction(opts.fallbackResponse))
				return opts.fallbackResponse(ctx, ctx.nodeID);
			else
				return Promise.resolve(opts.fallbackResponse);
		}

		return Promise.reject(err);
	}

	/**
	 * Emit an event (global & local)
	 * 
	 * @param {any} eventName
	 * @param {any} payload
	 * @returns
	 * 
	 * @memberOf ServiceBroker
	 */
	emit(eventName, payload) {
		if (this.transit)
			this.transit.emit(eventName, payload);

		return this.emitLocal(eventName, payload);
	}

	/**
	 * Emit an event only local
	 * 
	 * @param {any} eventName
	 * @param {any} payload
	 * @returns
	 * 
	 * @memberOf ServiceBroker
	 */
	emitLocal(eventName, payload) {
		this.logger.debug("Event emitted:", eventName);		

		return this.bus.emit(eventName, payload);
	}

	/**
	 * Get a list of names of local actions
	 * 
	 * @returns
	 * 
	 * @memberOf ServiceBroker
	 */
	getLocalActionList() {
		let res = {};
		this.actions.forEach((entry, key) => {
			let item = entry.getLocalItem();
			if (item && !/^\$node/.test(key)) // Skip internal actions
				res[key] = omit(item.data, ["handler", "service"]);
		});
		return res;
	}
	
	/**
	 * Process remote node info (list of actions)
	 * 
	 * @param {any} info
	 * 
	 * @memberOf ServiceBroker
	 */
	processNodeInfo(nodeID, node) {
		let isNewNode = !this.nodes.has(nodeID);
		node.lastHeartbeatTime = Date.now();
		node.available = true;
		this.nodes.set(node.nodeID, node);

		if (isNewNode) {
			this.emitLocal("node.connected", node);
			this.logger.info(`Node '${nodeID}' connected!`);
		}

		if (node.actions) {
			// Add external actions
			Object.keys(node.actions).forEach(name => {
				// Need to override the name cause of versioned action name;
				let action = Object.assign({}, node.actions[name], { name });
				this.registerAction(action, node.nodeID);
			});
		}
	}

	/**
	 * Set node to unavailable. 
	 * It will be called when a remote call is thrown a RequestTimeoutError exception.
	 * 
	 * @param {any} nodeID	Node ID
	 * 
	 * @memberOf ServiceBroker
	 */
	nodeUnavailable(nodeID) {
		let node = this.nodes.get(nodeID);
		if (node) {
			this.nodeDisconnected(nodeID, true);
		}
	}

	/**
	 * Check the given nodeID is available
	 * 
	 * @param {any} nodeID	Node ID
	 * @returns {boolean}
	 * 
	 * @memberOf ServiceBroker
	 */
	isNodeAvailable(nodeID) {
		let info = this.nodes.get(nodeID);
		if (info) 
			return info.available;

		return false;
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
			let node = this.nodes.get(nodeID);
			node.lastHeartbeatTime = Date.now();
			node.available = true;
		}
	}

	/**
	 * Node disconnected event handler. 
	 * Remove node and remove remote actions of node
	 * 
	 * @param {any} nodeID
	 * @param {Boolean} isUnexpected
	 * 
	 * @memberOf ServiceBroker
	 */
	nodeDisconnected(nodeID, isUnexpected) {
		if (this.nodes.has(nodeID)) {
			let node = this.nodes.get(nodeID);
			if (node.available) {
				node.available = false;
				if (node.actions) {
					// Remove remote actions of node
					Object.keys(node.actions).forEach(name => {
						let action = Object.assign({}, node.actions[name], { name });
						this.unregisterAction(action, node.nodeID);
					});
				}

				this.emitLocal(isUnexpected ? "node.broken" : "node.disconnected", node);
				//this.nodes.delete(nodeID);			
				this.logger.warn(`Node '${nodeID}' disconnected!`);
			}
		}
	}

	/**
	 * Check all registered remote nodes is live.
	 * 
	 * @memberOf ServiceBroker
	 */
	/* istanbul ignore next */
	checkRemoteNodes() {
		return; 
		// SKIP
		/*
		let now = Date.now();
		for (let entry of this.nodes.entries()) {
			if (now - (entry[1].lastHeartbeatTime || 0) > this.options.nodeHeartbeatTimeout * 1000) {
				this.nodeDisconnected(entry[0]);
			}
		}*/
	}
}

module.exports = ServiceBroker;