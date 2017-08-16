/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const Promise 			= require("bluebird");
const EventEmitter2 	= require("eventemitter2").EventEmitter2;
const _ 				= require("lodash");
const glob 				= require("glob");
const path 				= require("path");

const Transit 			= require("./transit");
const ServiceRegistry 	= require("./service-registry");
const E 				= require("./errors");
const utils 			= require("./utils");
const Logger 			= require("./logger");
const Validator 		= require("./validator");
const BrokerStatistics 	= require("./statistics");
const healthInfo 		= require("./health");

const Cachers 			= require("./cachers");
const Transporters 		= require("./transporters");
const Serializers 		= require("./serializers");

// Registry strategies
const { STRATEGY_ROUND_ROBIN } 	= require("./constants");

// Circuit-breaker states
const { CIRCUIT_HALF_OPEN } 	= require("./constants");


const LOCAL_NODE_ID = null; // `null` means local nodeID

const defaultConfig = {
	namespace: "",
	nodeID: null,

	logger: null,
	logLevel: null,

	transporter: null,
	requestTimeout: 0 * 1000,
	requestRetry: 0,
	maxCallLevel: 0,
	heartbeatInterval: 10,
	heartbeatTimeout: 30,

	registry: {
		strategy: STRATEGY_ROUND_ROBIN,
		preferLocal: true				
	},

	circuitBreaker: {
		enabled: false,
		maxFailures: 5,
		halfOpenTime: 10 * 1000,
		failureOnTimeout: true,
		failureOnReject: true
	},

	cacher: null,
	serializer: null,

	validation: true,
	metrics: false,
	metricsRate: 1,
	statistics: false,
	internalActions: true
	
	// ServiceFactory: null,
	// ContextFactory: null
};

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
		this.options = _.defaultsDeep(options, defaultConfig);

		// Promise constructor
		this.Promise = Promise;

		// Class factories
		this.ServiceFactory = this.options.ServiceFactory || require("./service");
		this.ContextFactory = this.options.ContextFactory || require("./context");

		// Namespace
		this.namespace = this.options.namespace || "";

		// Self nodeID
		this.nodeID = this.options.nodeID || utils.getNodeID();

		// Logger
		this.logger = this.getLogger("broker");

		// Local event bus
		this.bus = new EventEmitter2({
			wildcard: true,
			maxListeners: 100
		});

		// Internal maps
		this.services = [];
		this.serviceRegistry = new ServiceRegistry(this.options.registry);
		this.serviceRegistry.init(this);

		// Middlewares
		this.middlewares = [];

		// Cacher
		this.cacher = this._resolveCacher(this.options.cacher);
		if (this.cacher) {
			this.cacher.init(this);
		}

		// Serializer
		this.serializer = this._resolveSerializer(this.options.serializer);
		this.serializer.init(this);

		// Validation
		if (this.options.validation !== false) {
			this.validator = new Validator();
			if (this.validator) {
				this.validator.init(this);
			}
		}

		// Transit & Transporter
		if (this.options.transporter) {
			const tx = this._resolveTransporter(this.options.transporter);
			this.transit = new Transit(this, tx);
		}

		// Counter for metricsRate
		this.sampleCount = 0;

		if (this.options.statistics)
			this.statistics = new BrokerStatistics(this);

		this.getNodeHealthInfo = () => healthInfo(this);

		// Register internal actions
		if (this.options.internalActions)
			this.registerInternalActions();

		// Graceful exit
		this._closeFn = () => {
			/* istanbul ignore next */
			this.stop().then(() => process.exit(0));
		};

		process.setMaxListeners(0);
		process.on("beforeExit", this._closeFn);
		process.on("exit", this._closeFn);
		process.on("SIGINT", this._closeFn);
	}

	_resolveTransporter(opt) {
		if (opt instanceof Transporters.Base) {
			return opt;
		} else if (_.isString(opt)) {
			let TransporterClass = Transporters[opt];
			if (TransporterClass)
				return new TransporterClass();

			if (opt.startsWith("nats://"))
				TransporterClass = Transporters.NATS;
			else if (opt.startsWith("mqtt://"))
				TransporterClass = Transporters.MQTT;
			else if (opt.startsWith("redis://"))
				TransporterClass = Transporters.Redis;

			if (TransporterClass)
				return new TransporterClass(opt);
			else
				throw new E.MoleculerError(`Invalid transporter type '${opt}'`, null, "NOT_FOUND_TRANSPORTER", { type: opt });

		} else if (_.isObject(opt)) {
			let TransporterClass = Transporters[opt.type || "NATS"];
			if (TransporterClass)
				return new TransporterClass(opt.options);
			else
				throw new E.MoleculerError(`Invalid transporter type '${opt.type}'`, null, "NOT_FOUND_TRANSPORTER", { type: opt.type });
		}
		
		return null;
	}

	_resolveCacher(opt) {
		if (opt instanceof Cachers.Base) {
			return opt;
		} else if (opt === true) {
			return new Cachers.Memory();
		} else if (_.isString(opt)) {
			let CacherClass = Cachers[opt];
			if (CacherClass)
				return new CacherClass();

			if (opt.startsWith("redis://"))
				CacherClass = Cachers.Redis;

			if (CacherClass)
				return new CacherClass(opt);
			else
				throw new E.MoleculerError(`Invalid cacher type '${opt}'`, null, "NOT_FOUND_CACHER", { type: opt });

		} else if (_.isObject(opt)) {
			let CacherClass = Cachers[opt.type || "Memory"];
			if (CacherClass)
				return new CacherClass(opt.options);
			else
				throw new E.MoleculerError(`Invalid cacher type '${opt.type}'`, null, "NOT_FOUND_CACHER", { type: opt.type });
		}
		
		return null;
	}

	_resolveSerializer(opt) {
		if (opt instanceof Serializers.Base) {
			return opt;
		} else if (_.isString(opt)) {
			let SerializerClass = Serializers[opt];
			if (SerializerClass)
				return new SerializerClass();
			else
				throw new E.MoleculerError(`Invalid serializer type '${opt}'`, null, "NOT_FOUND_SERIALIZER", { type: opt });

		} else if (_.isObject(opt)) {
			let SerializerClass = Serializers[opt.type || "JSON"];
			if (SerializerClass)
				return new SerializerClass(opt.options);
			else
				throw new E.MoleculerError(`Invalid serializer type '${opt.type}'`, null, "NOT_FOUND_SERIALIZER", { type: opt.type });
		}

		return new Serializers.JSON();
	}

	/**
	 * Start broker. If has transporter, transporter.connect will be called.
	 * 
	 * @memberOf ServiceBroker
	 */
	start() {
		return Promise.resolve()
			.then(() => {
				// Call service `started` handlers
				return Promise.all(this.services.map(svc => svc.started.call(svc)));
			})
			.catch(err => {
				/* istanbul ignore next */
				this.logger.error("Unable to start all services!", err);
				return Promise.reject(err);
			})
			.then(() => {
				if (this.transit)
					return this.transit.connect();
			})
			.then(() => {
				this.logger.info("Broker started.");
			});
	}

	/**
	 * Stop broker. If has transporter, transporter.disconnect will be called.
	 * 
	 * @memberOf ServiceBroker
	 */
	stop() {
		return Promise.resolve()
			.then(() => {
				// Call service `started` handlers
				return Promise.all(this.services.map(svc => svc.stopped.call(svc)));
			})
			.catch(err => {
				/* istanbul ignore next */
				this.logger.error("Unable to stop all services!", err);
			})
			.then(() => {
				if (this.transit) {
					return this.transit.disconnect();
				}
			})
			.then(() => {
				if (this.cacher) {
					return this.cacher.close();
				}
			})
			.then(() => {
				this.logger.info("Broker stopped.");

				process.removeListener("beforeExit", this._closeFn);
				process.removeListener("exit", this._closeFn);
				process.removeListener("SIGINT", this._closeFn);
			});
	}

	/**
	 * Switch the console to REPL mode.
	 * 
	 * @example
	 * broker.start().then(() => broker.repl());
	 * 
	 * @memberOf ServiceBroker
	 */
	repl() {
		let repl;
		try {
			repl = require("moleculer-repl");
		} 
		catch (error) {
			console.error("The 'moleculer-repl' package is missing! Please install it with 'npm install moleculer-repl' command!"); // eslint-disable-line no-console
			this.logger.error("The 'moleculer-repl' package is missing! Please install it with 'npm install moleculer-repl' command!");
			this.logger.debug("ERROR", error);
			return;
		}

		if (repl)
			repl(this);
	}

	/**
	 * Get a custom logger for sub-modules (service, transporter, cacher, context...etc)
	 * 
	 * @param {String} module	Name of module
	 * @param {String} service	Service name
	 * @param {String|Number} version	Service version
	 * @returns {Logger}
	 * 
	 * @memberOf ServiceBroker
	 */
	getLogger(module, service, version) {
		let bindings = {
			nodeID: this.nodeID, 
			ns: this.namespace
		};
		if (service) {
			bindings.svc = service;
			if (version)
				bindings.ver = version;
		}
		else
			bindings.mod = module;

		// Call logger creator
		if (_.isFunction(this.options.logger))
			return this.options.logger.call(this, bindings);

		// External logger
		if (_.isObject(this.options.logger) && this.options.logger !== console)
			return Logger.extend(this.options.logger);

		// Create console logger
		if (this.options.logger === true || this.options.logger === console)
			return Logger.createDefaultLogger(console, bindings, this.options.logLevel || "info", this.options.logFormatter);

		return Logger.createDefaultLogger();
	}

	/**
	 * Fatal error. Print the message to console and exit the process (if need)
	 * 
	 * @param {String} message 
	 * @param {Error?} err 
	 * @param {boolean} [needExit=true] 
	 * 
	 * @memberOf ServiceBroker
	 */
	fatal(message, err, needExit = true) {
		if (err)
			this.logger.debug("ERROR", err);

		console.error(message); // eslint-disable-line no-console
		this.logger.fatal(message);

		if (needExit)
			process.exit(2);
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

		if (Array.isArray(fileMask))
			serviceFiles = fileMask.map(f => path.join(folder, f));
		else
			serviceFiles = glob.sync(path.join(folder, fileMask));

		if (serviceFiles) {
			serviceFiles.forEach(filename => {
				this.loadService(filename);
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
		this.logger.debug(`Load service '${path.basename(fName)}'...`);
		let schema = require(fName);
		let svc;
		if (_.isFunction(schema)) {
			svc = schema(this);
			if (!(svc instanceof this.ServiceFactory)) {
				svc = this.createService(svc);
			}
		} else {
			svc = this.createService(schema);
		}

		if (svc)
			svc.__filename = filePath;

		return svc;
	}

	/**
	 * Create a new service by schema
	 * 
	 * @param {any} schema	Schema of service
	 * @param {any=} schemaMods	Modified schema
	 * @returns {Service}
	 * 
	 * @memberOf ServiceBroker
	 */
	createService(schema, schemaMods) {
		let s = schema;
		if (schemaMods)
			s = utils.mergeSchemas(schema, schemaMods);

		let service = new this.ServiceFactory(this, s);

		this.servicesChanged();

		return service;
	}

	/**
	 * Destroy a local service
	 * 
	 * @param {Service} service 
	 * @memberof ServiceBroker
	 */
	destroyService(service) {
		return Promise.resolve()
			.then(() => service.stopped.call(service))
			.catch(err => {
				/* istanbul ignore next */
				this.logger.error(`Unable to stop service '${service.name}'!`, err);
			})
			.then(() => {
				_.remove(this.services, svc => svc == service);
				this.serviceRegistry.unregisterService(LOCAL_NODE_ID, service.name);

				this.logger.info(`Service '${service.name}' is destroyed!`);
				this.servicesChanged();
			});
	}

	/**
	 * Register a local service
	 * 
	 * @param {Service} service
	 * 
	 * @memberOf ServiceBroker
	 */
	registerLocalService(service) {
		this.services.push(service);

		this.serviceRegistry.registerService(LOCAL_NODE_ID, service);

		//this.emitLocal(`register.service.${service.name}`, service);
		this.logger.info(`'${service.name}' service is registered!`);
	}

	/**
	 * Register a remote service
	 * 
	 * @param {String} nodeID		NodeID if it is on a remote server/node
	 * @param {Service} service
	 * 
	 * @memberOf ServiceBroker
	 */
	registerRemoteService(nodeID, service) {
		this.serviceRegistry.registerService(nodeID, service);

		if (service.actions) {
			_.forIn(service.actions, action => {
				this.registerAction(nodeID, Object.assign({}, action, { service }));
			});
		}

	}

	/**
	 * Register an action
	 * 
	 * @param {String} nodeID	NodeID if it is on a remote server/node
	 * @param {any} action		action schema
	 * 
	 * @memberOf ServiceBroker
	 */
	registerAction(nodeID, action) {
		// Wrap middlewares on local actions
		if (nodeID == LOCAL_NODE_ID)
			this.wrapAction(action);
		
		this.serviceRegistry.registerAction(nodeID, action);
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

		action.handler = handler;

		return action;
	}

	/**
	 * Unregister services by node
	 * 
	 * @param {String} nodeID 
	 * 
	 * @memberOf ServiceBroker
	 */
	unregisterServicesByNode(nodeID) {
		this.serviceRegistry.unregisterServicesByNode(nodeID);
	}

	/**
	 * Unregister an action on a local server. 
	 * It will be called when a remote node disconnected. 
	 * 
	 * @param {String} nodeID		NodeID if it is on a remote server/node
	 * @param {any} action		action schema
	 * 
	 * @memberOf ServiceBroker
	 */
	unregisterAction(nodeID, action) {
		this.serviceRegistry.unregisterAction(nodeID, action);
	}

	/**
	 * Register internal actions
	 * 
	 * @memberOf ServiceBroker
	 */
	registerInternalActions() {
		this.serviceRegistry.registerService(LOCAL_NODE_ID, {
			name: "$node", 
			settings: {}
		});

		const addAction = (name, handler) => {
			this.registerAction(LOCAL_NODE_ID, {
				name,
				cache: false,
				handler: Promise.method(handler),
				service: {
					name: "$node"
				}
			});
		};

		addAction("$node.list", () => {
			let res = [];
			const localNode = this.transit.getNodeInfo();
			localNode.id = LOCAL_NODE_ID;
			localNode.available = true;
			res.push(localNode);
			
			this.transit.nodes.forEach(node => {
				//res.push(pick(node, ["nodeID", "available"]));
				res.push(node);
			});

			return res;
		});

		addAction("$node.services", ctx => {
			let res = [];

			const services = this.serviceRegistry.getServiceList(ctx.params);
			
			services.forEach(svc => {
				let item = res.find(o => o.name == svc.name && o.version == svc.version);
				if (item) {
					item.nodes.push(svc.nodeID);
					// Merge services
					_.forIn(svc.actions, (action, name) => {
						if (action.protected === true) return;

						if (!item.actions[name])
							item.actions[name] = _.omit(action, ["handler", "service"]);
					});
					
				} else {
					item = _.pick(svc, ["name", "version", "settings"]);
					item.nodes = [svc.nodeID];
					item.actions = {};
					_.forIn(svc.actions, (action, name) => {
						if (action.protected === true) return;

						item.actions[name] = _.omit(action, ["handler", "service"]);
					});
					res.push(item);
				}
			});

			return res;
		});

		addAction("$node.actions", ctx => {
			return this.serviceRegistry.getActionList(ctx.params);
		});

		addAction("$node.health", () => this.getNodeHealthInfo());

		if (this.statistics) {
			addAction("$node.stats", () => {
				return this.statistics.snapshot();
			});				
		}
	}

	/**
	 * It will be called when a new service registered or unregistered
	 * 
	 * @memberof ServiceBroker
	 */
	servicesChanged() {
		this.emitLocal("services.changed");

		// Notify other nodes, we have a new service list.
		if (this.transit && this.transit.connected) {
			this.transit.sendNodeInfo();
		}
	}

	/**
	 * Subscribe to an event
	 * 
	 * @param {String} name
	 * @param {Function} handler
	 * 
	 * @memberOf ServiceBroker
	 */
	on(name, handler) {
		this.bus.on(name, handler);
	}

	/**
	 * Subscribe to an event once
	 * 
	 * @param {String} name
	 * @param {Function} handler
	 * 
	 * @memberOf ServiceBroker
	 */
	once(name, handler) {
		this.bus.once(name, handler);
	}

	/**
	 * Unsubscribe from an event
	 * 
	 * @param {String} name
	 * @param {Function} handler
	 * 
	 * @memberOf ServiceBroker
	 */
	off(name, handler) {
		this.bus.off(name, handler);
	}

	/**
	 * Get a local service by name
	 * 
	 * @param {String} serviceName
	 * @returns {Service}
	 * 
	 * @memberOf ServiceBroker
	 */
	getService(serviceName) {
		return this.services.find(service => service.name == serviceName);
	}

	/**
	 * Has a local service by name
	 * 
	 * @param {String} serviceName
	 * @returns {Boolean}
	 * 
	 * @memberOf ServiceBroker
	 */
	hasService(serviceName) {
		return this.services.find(service => service.name == serviceName) != null;
	}

	/**
	 * Has an action by name
	 * 
	 * @param {String} actionName
	 * @returns {Boolean}
	 * 
	 * @memberOf ServiceBroker
	 */
	hasAction(actionName) {
		return this.serviceRegistry.hasAction(actionName);
	}	

	/**
	 * Get an action by name
	 * 
	 * @param {String} actionName
	 * @returns {Object}
	 * 
	 * @memberOf ServiceBroker
	 */
	getAction(actionName) {
		const item = this.serviceRegistry.findAction(actionName);
		if (item) {
			return item.nextAvailable();
		}
		return null;
	}	

	/**
	 * Check has callable action handler
	 * 
	 * @param {String} actionName
	 * @returns {Boolean}
	 * 
	 * @memberOf ServiceBroker
	 */
	isActionAvailable(actionName) {
		const item = this.serviceRegistry.findAction(actionName);
		return item && item.count() > 0;
	}	

	/**
	 * Add a middleware to the broker
	 * 
	 * @param {Function} mws
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
	 * Create a new Context instance
	 * 
	 * @param {Object} action 
	 * @param {String?} nodeID 
	 * @param {Object?} params 
	 * @param {Object} opts 
	 * @returns {Context}
	 * 
	 * @memberOf ServiceBroker
	 */
	createNewContext(action, nodeID, params, opts) {
		const ctx = new this.ContextFactory(this, action);
		ctx.nodeID = nodeID;
		ctx.setParams(params);

		// RequestID
		if (opts.requestID != null)
			ctx.requestID = opts.requestID;
		else if (opts.parentCtx != null && opts.parentCtx.requestID != null)
			ctx.requestID = opts.parentCtx.requestID;

		// Meta
		if (opts.parentCtx != null && opts.parentCtx.meta != null)
			ctx.meta = _.assign({}, opts.parentCtx.meta, opts.meta);
		else if (opts.meta != null)
			ctx.meta = opts.meta;

		// Timeout
		ctx.timeout = opts.timeout;
		ctx.retryCount = opts.retryCount;

		if (opts.parentCtx != null) {
			ctx.parentID = opts.parentCtx.id;
			ctx.level = opts.parentCtx.level + 1;
		}

		// Metrics
		if (opts.parentCtx != null)
			ctx.metrics = opts.parentCtx.metrics;
		else
			ctx.metrics = this.shouldMetric();

		// ID, parentID, level
		if (ctx.metrics || nodeID) {
			ctx.generateID();
		}

		return ctx;
	}

	/**
	 * Call an action (local or remote)
	 * 
	 * @param {any} actionName	name of action
	 * @param {any} params		params of action
	 * @param {any} opts		options of call (optional)
	 * @returns
	 * 
	 * @performance-critical
	 * @memberOf ServiceBroker
	 */
	call(actionName, params, opts = {}) {
		if (opts.timeout == null)
			opts.timeout = this.options.requestTimeout || 0;

		if (opts.retryCount == null)
			opts.retryCount = this.options.requestRetry || 0;		
		
		let endpoint;
		if (typeof actionName !== "string") {
			endpoint = actionName;
			actionName = endpoint.action.name;
		} else {
			if (opts.nodeID) {
				// Direct call
				endpoint = this.serviceRegistry.getEndpointByNodeID(actionName, opts.nodeID);
				if (!endpoint) {
					this.logger.warn(`Service '${actionName}' is not available on '${opts.nodeID}' node!`);
					return Promise.reject(new E.ServiceNotFoundError(actionName, opts.nodeID));
				}

			} else {
				// Find action by name
				let actions = this.serviceRegistry.findAction(actionName);
				if (actions == null) {
					this.logger.warn(`Service '${actionName}' is not registered!`);
					return Promise.reject(new E.ServiceNotFoundError(actionName));
				}
				
				// Get an endpoint
				endpoint = actions.nextAvailable();
				if (endpoint == null) {
					const errMsg = `Service '${actionName}' is not available!`;
					this.logger.warn(errMsg);
					return Promise.reject(new E.ServiceNotFoundError(actionName));
				}
			}
		}

		// Expose action info
		let action = endpoint.action;
		let nodeID = endpoint.nodeID;

		this.logger.debug(`Call action '${actionName}' on node '${nodeID || "<local>"}'`);
		
		// Create context
		let ctx;
		if (opts.ctx != null) {
			// Reused context
			ctx = opts.ctx; 
			ctx.nodeID = nodeID;
			ctx.action = action;
		} else {
			// New root context
			ctx = this.createNewContext(action, nodeID, params, opts);
		}

		if (this.options.maxCallLevel > 0 && ctx.level > this.options.maxCallLevel) {
			return this.Promise.reject(new E.MaxCallLevelError({ level: ctx.level, action: actionName }));
		}

		// Call handler or transfer request
		let p;
		if (endpoint.local) {
			// Add metrics start
			if (ctx.metrics === true || ctx.timeout > 0 || this.statistics)
				ctx._metricStart(ctx.metrics);

			p = action.handler(ctx);

			// Timeout handler
			if (ctx.timeout > 0 && p.timeout)
				p = p.timeout(ctx.timeout);

			if (ctx.metrics === true || this.statistics) {
				// Add metrics & statistics
				p = p.then(res => {
					this._finishCall(ctx, null);
					return res;
				});
			}
		} else {
			p = this.transit.request(ctx);

			// Timeout handler
			if (ctx.timeout > 0 && p.timeout)
				p = p.timeout(ctx.timeout);
		}

		// Handle half-open state in circuit breaker
		if (this.options.circuitBreaker.enabled && endpoint.state === CIRCUIT_HALF_OPEN) {
			p = p.then(res => {
				endpoint.circuitClose();
				return res;
			});
		}

		// Error handler
		p = p.catch(err => this._callErrorHandler(err, ctx, endpoint, opts));

		// Pointer to Context
		p.ctx = ctx;

		return p;
	}

	/**
	 * Error handler for `call` method
	 * 
	 * @param {Error} err 
	 * @param {Context} ctx 
	 * @param {Endpoint} endpoint
	 * @param {Object} opts 
	 * @returns 
	 * 
	 * @memberOf ServiceBroker
	 */
	_callErrorHandler(err, ctx, endpoint, opts) {
		const actionName = ctx.action.name;
		const nodeID = ctx.nodeID;

		if (!(err instanceof Error)) {
			err = new E.MoleculerError(err, 500);
		}
		if (err instanceof Promise.TimeoutError)
			err = new E.RequestTimeoutError(actionName, nodeID || this.nodeID);

		err.ctx = ctx;

		if (nodeID) {
			// Remove pending request
			this.transit.removePendingRequest(ctx.id);
		}

		if (this.options.circuitBreaker.enabled) {
			if (err instanceof E.RequestTimeoutError) {
				if (this.options.circuitBreaker.failureOnTimeout)
					endpoint.failure();

			} else if (err.code >= 500 && this.options.circuitBreaker.failureOnReject) {
				endpoint.failure();
			}
		}

		if (err instanceof E.RequestTimeoutError) {
			// Retry request
			if (ctx.retryCount-- > 0) {
				this.logger.warn(`Action '${actionName}' timed out on '${nodeID}'!`);
				this.logger.warn(`Recall '${actionName}' action (retry: ${ctx.retryCount + 1})...`);

				opts.ctx = ctx; // Reuse this context
				return this.call(actionName, ctx.params, opts);
			}
		}

		// Need it? this.logger.error("Action request error!", err);

		this._finishCall(ctx, err);

		// Handle fallback response
		if (opts.fallbackResponse) {
			this.logger.warn(`Action '${actionName}' returns with fallback response.`);
			if (_.isFunction(opts.fallbackResponse))
				return opts.fallbackResponse(ctx, err);
			else
				return Promise.resolve(opts.fallbackResponse);
		}

		return Promise.reject(err);	
	}

	_finishCall(ctx, err) {
		if (ctx.metrics || this.statistics) {
			ctx._metricFinish(err, ctx.metrics);
		}

		if (this.statistics)
			this.statistics.addRequest(ctx.action.name, ctx.duration, err ? err.code || 500 : null);
	}	

	/**
	 * Multiple action calls.
	 * 
	 * @param {Array<Object>|Object} def Calling definitions.
	 * @returns {Promise<Array<Object>|Object>}
	 * 
	 * @example
	 * Call `mcall` with an array:
	 * ```js
	 * broker.mcall([
	 * 	{ action: "posts.find", params: { limit: 5, offset: 0 } },
	 * 	{ action: "users.find", params: { limit: 5, sort: "username" }, opts: { timeout: 500 } }
	 * ]).then(results => {
	 * 	let posts = results[0];
	 * 	let users = results[1];
	 * })
	 * ```
	 * 
	 * @example
	 * Call `mcall` with an Object:
	 * ```js
	 * broker.mcall({
	 * 	posts: { action: "posts.find", params: { limit: 5, offset: 0 } },
	 * 	users: { action: "users.find", params: { limit: 5, sort: "username" }, opts: { timeout: 500 } }
	 * }).then(results => {
	 * 	let posts = results.posts;
	 * 	let users = results.users;
	 * })
	 * ```
	 * @throws MoleculerError - If the `def` is not an `Array` and not an `Object`.
	 * @memberof ServiceBroker
	 */
	mcall(def) {
		if (Array.isArray(def)) {
			let p = def.map(item => this.call(item.action, item.params, item.options));
			return Promise.all(p);

		} else if (_.isObject(def)) {
			let results = {};
			let p = Object.keys(def).map(name => {
				const item = def[name];

				return this.call(item.action, item.params, item.options).then(res => results[name] = res);
			});
			return Promise.all(p).then(() => results);
		} else
			throw new E.MoleculerError("Invalid calling definition");
	}

	/**
	 * Check should metric the current call
	 * 
	 * @returns 
	 * 
	 * @memberOf ServiceBroker
	 */
	shouldMetric() {
		if (this.options.metrics) {
			this.sampleCount++;
			if (this.sampleCount * this.options.metricsRate >= 1) {
				this.sampleCount = 0;
				return true;
			}
			
		}
		return false;
	}

	/**
	 * Emit an event (global & local)
	 * 
	 * @param {string} eventName
	 * @param {any} payload
	 * @returns {boolean}
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
	 * @param {string} eventName
	 * @param {any} payload
	 * @param {string=} nodeID of server
	 * @returns {boolean}
	 * 
	 * @memberOf ServiceBroker
	 */
	emitLocal(eventName, payload, sender = null) {
		this.logger.debug("Event emitted:", eventName);		

		return this.bus.emit(eventName, payload, sender);
	}
	
}

/**
 * Version of Moleculer
 */
ServiceBroker.MOLECULER_VERSION = require("../package.json").version;

/**
 * Version of Moleculer
 */
ServiceBroker.prototype.MOLECULER_VERSION = ServiceBroker.MOLECULER_VERSION;

/**
 * Local NodeID
 */
ServiceBroker.LOCAL_NODE_ID = LOCAL_NODE_ID;

/**
 * Local NodeID
 */
ServiceBroker.prototype.LOCAL_NODE_ID = LOCAL_NODE_ID;

/**
 * Default configuration
 */
ServiceBroker.defaultConfig = defaultConfig;

module.exports = ServiceBroker;