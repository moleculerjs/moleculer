/*
 * servicer
 * Copyright (c) 2017 Icebob (https://github.com/icebob/servicer)
 * MIT Licensed
 */

"use strict";

const Promise = require("bluebird");
const EventEmitter2 = require("eventemitter2").EventEmitter2;
const BalancedList = require("./balanced-list");
const errors = require("./errors");
const utils = require("./utils");
const Logger = require("./logger");
const Validator = require("./validator");
const BrokerStatistics = require("./statistics");

const _ = require("lodash");
const glob = require("glob");
const path = require("path");
const os = require("os");

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
			nodeID: null,

			logger: null,
			logLevel: "info",

			transporter: null,
			requestTimeout: 15 * 1000,
			requestRetry: 0,
			sendHeartbeatTime: 10,
			nodeHeartbeatTimeout: 30,

			cacher: null,

			metrics: false,
			metricsNodeTime: 5 * 1000,
			statistics: false,
			validation: true,
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

		// Transporter
		this.transporter = this.options.transporter;
		if (this.transporter) {
			this.transporter.init(this);
		}

		// TODO remove to stats
		this._callCount = 0;

		if (this.options.statistics)
			this.statistics = new BrokerStatistics(this);

		// Register internal actions
		if (this.options.internalActions)
			this.registerInternalActions();

		// Graceful exit
		this._closeFn = () => {
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
			if (service && service.schema && _.isFunction(service.schema.started)) {
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
		// Call service `started` handlers
		this.services.forEach(service => {
			if (service && service.schema && _.isFunction(service.schema.stopped)) {
				service.schema.stopped.call(service);
			}
		});

		if (this.metricsTimer) {
			clearInterval(this.metricsTimer);
			this.metricsTimer = null;
		}
		
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
		this.logger.info(`${service.name} service registered!`);
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
		// Append action by name
		let item = this.actions.get(action.name);
		if (!item) {
			item = new BalancedList();
			this.actions.set(action.name, item);
		}
		if (item.add(action, 0, nodeID)) {
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
		/* istanbul ignore next */
		if (this.middlewares.length == 0) return action;

		let mws = Array.from(this.middlewares);
		let handler = mws.reduce((handler, mw) => {
			return mw(handler, action);
		}, action.handler);

		action.handler = handler;

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
				handler
			});
		};

		addAction("$node.list", ctx => {
			let res = [];
			this.nodes.forEach(node => {
				res.push(_.pick(node, ["nodeID", "available"]));
			});

			return res;
		});

		addAction("$node.services", ctx => {
			let res = [];
			this.services.forEach(service => {
				res.push(_.pick(service, ["name", "version"]));
			});

			return res;
		});

		addAction("$node.actions", ctx => {
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

		addAction("$node.health", ctx => this.getNodeHealthInfo());

		if (this.statistics) {
			addAction("$node.stats", ctx => {
				return this.statistics.snapshot();
			});		
			
		}
	}

	/**
	 * Get health info of node
	 * 
	 * @returns Promise
	 * 
	 * @memberOf ServiceBroker
	 */
	getNodeHealthInfo() {
		return Promise.resolve({})

			// CPU
			.then(res => {
				const load = os.loadavg();
				res.cpu = {
					load1: load[0],
					load5: load[1],
					load15: load[2],
					cores: os.cpus().length,
				};
				res.cpu.utilization = Math.floor(load[0] * 100 / res.cpu.cores);

				return res;
			})

			// Memory
			.then(res => {
				res.mem = {
					free: os.freemem(),
					total: os.totalmem(),
				};
				res.mem.percent = (res.mem.free * 100 / res.mem.total);

				return res;
			})

			// OS 
			.then(res => {
				res.os = {
					uptime: os.uptime(),
					type: os.type(),
					release: os.release(),
					hostname: os.hostname(),
					arch: os.arch(),
					platform: os.platform(),
					user: os.userInfo()
				};

				return res;
			})

			// Process 
			.then(res => {
				res.process = {
					pid: process.pid,
					memory: process.memoryUsage(),
					uptime: process.uptime()
				};

				return res;
			})

			// Network interfaces
			.then(res => {
				res.net = {
					ip: []
				};
				res.mem.percent = (res.mem.free * 100 / res.mem.total);

				const interfaces = os.networkInterfaces();
				for (let iface in interfaces) {
					for (let i in interfaces[iface]) {
						const f = interfaces[iface][i];
						if (f.family === "IPv4" && !f.internal) {
							res.net.ip.push(f.address);
							break;
						}
					}
				}					

				return res;
			})

			// Date & time
			.then(res => {
				res.time = {
					now: Date.now(),
					iso: new Date().toISOString(),
					utc: new Date().toUTCString()
				};
				return res;
			});

			// TODO: event loop & GC info
			// https://github.com/RisingStack/trace-nodejs/blob/master/lib/agent/metrics/apm/index.js

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
		return _.find(this.services, service => service.name == serviceName);
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
		return _.find(this.services, service => service.name == serviceName) != null;
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

	/*
	// Függvény ami a meghívja a következő middleware-t
	__runNextMiddleware(ctx, middleware, next) {
		// Middleware kód meghívása és next függvény generálása a folytatáshoz.
		try {
			let res = middleware(ctx, next);
			return utils.isPromise(res) ? res: Promise.resolve(res);
		} catch(err) {
			return Promise.reject(err);
		}
	}	*/

	/**
	 * Call middlewares with context
	 * 
	 * @param {Context} 	ctx			Context
	 * @param {Function} 	masterNext	Master function after invoked middlewares
	 * @returns {Promise}
	 * 
	 * @memberOf ServiceBroker
	 */
	/*
	callMiddlewares(ctx, masterNext) {
		// Ha nincs regisztrált middleware egyből meghívjuk a master kódot
		if (this.middlewares.length == 0) return masterNext(ctx);

		let self = this;
		let idx = 0;

		// A következő middleware hívásához használt függvény. Ezt hívják meg a middleware-ből
		// ha végeztek a dolgukkal. Ez egy Promise-t ad vissza, amihez .then-t írhatnak
		// ami pedig akkor hívódik meg, ha a masterNext lefutott.
		function next(p) {
			// Ha Promise-t adott vissza a middleware hívás akkor csak ha 'resolved' lesz, akkor hívjuk meg a következőt
			if (utils.isPromise(p)) {
				return p.then(res => {
					// Ha eredménnyel tért vissza, akkor azt jelenti, hogy 
					// nem kell több middleware-t hívni, egyből visszaadjuk az eredményt
					// Pl: cache-ben megvolt az adat.
					if (res)
						return res;

					return self.__runNextMiddleware(ctx, idx < self.middlewares.length ? self.middlewares[idx++] : masterNext, next);
				});
			} else {
				// Ha nem, akkor közvetlenül
				return self.__runNextMiddleware(ctx, idx < self.middlewares.length ? self.middlewares[idx++] : masterNext, next);
			}
		}

		// Első middleware meghívása
		return Promise.resolve(next());
	}*/

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
		/* istanbul ignore next */
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
			ctx = new this.ContextFactory({ broker: this, action, params, nodeID, requestID: opts.requestID });
		}
		this._callCount++;

		if (actionItem.local) {
			// Local action call
			return this._localCall(ctx, opts);
		} else {
			return this._remoteCall(ctx, opts);
		}
	}

	_localCall(ctx, opts) {
		this.logger.debug(`Call local '${ctx.action.name}' action...`);
		let p = ctx.invoke(ctx.action.handler);

		if (this.statistics) {
			// Because ES6 Promise doesn't support .finally()
			p = p.then(data => {
				this.statistics.addRequest(ctx.action.name, ctx.duration, null);
				return data;
			}).catch(err => {
				this.statistics.addRequest(ctx.action.name, ctx.duration, err.code || 500);
				return Promise.reject(err);
			});
		}
		return p;
	}

	_remoteCall(ctx, opts = {}) {
		// Remote action call
		this.logger.debug(`Call remote '${ctx.action.name}' action on '${ctx.nodeID}' node...`);

		if (opts.timeout == null)
			opts.timeout = this.options.requestTimeout;

		if (opts.retryCount == null)
			opts.retryCount = this.options.requestRetry || 0;
	

		return ctx.invoke(ctx => {
			return this.transporter.request(ctx, opts).catch(err => {
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
					if (_.isFunction(opts.fallbackResponse))
						return opts.fallbackResponse(ctx, ctx.nodeID);
					else
						return Promise.resolve(opts.fallbackResponse);
				}

				return Promise.reject(err);
			});
		});
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
		if (this.transporter) {
			this.transporter.emit(eventName, payload);
		}

		this.logger.debug("Event emitted", eventName, payload);		

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
				res[key] = _.omit(item.data, ["handler", "service"]);
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
					// Add external actions
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

	metricsEnabled() {
		return this.options.metrics;
	}
}

module.exports = ServiceBroker;