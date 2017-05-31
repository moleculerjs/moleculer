/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const Promise = require("bluebird");
const EventEmitter2 = require("eventemitter2").EventEmitter2;
const Transit = require("./transit");
const ServiceRegistry = require("./service-registry");
const E = require("./errors");
const utils = require("./utils");
const Logger = require("./logger");
const Validator = require("./validator");
const BrokerStatistics = require("./statistics");
const healthInfo = require("./health");
const startREPL = require("./repl");

const JSONSerializer = require("./serializers/json");

// Registry strategies
const { STRATEGY_ROUND_ROBIN } = require("./constants");

// Circuit-breaker states
const { CIRCUIT_HALF_OPEN } = require("./constants");

const _ = require("lodash");
const pick = require("lodash/pick");

const glob = require("glob");
const path = require("path");

const LOCAL_NODE_ID = null; // `null` means local nodeID

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
		});

		// Promise constructor
		this.Promise = Promise;

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
		this.services = [];
		this.serviceRegistry = new ServiceRegistry(this.options.registry);
		this.serviceRegistry.init(this);

		// Middlewares
		this.middlewares = [];

		// Cacher
		this.cacher = this.options.cacher;
		if (this.cacher) {
			this.cacher.init(this);
		}

		// Serializer
		this.serializer = this.options.serializer;
		if (!this.serializer)
			this.serializer = new JSONSerializer();
		this.serializer.init(this);

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
		return Promise.resolve()
		.then(() => {
			// Call service `started` handlers
			this.services.forEach(service => {
				if (service && service.schema && _.isFunction(service.schema.started)) {
					service.schema.started.call(service);
				}
			});
		})
		.catch(err => {
			this.logger.error("Unable to start all services!", err);
		})
		.then(() => {
			if (this.transit)
				return this.transit.connect();
		})
		.then(() => {
			this.logger.info(`Broker started. NodeID: ${this.nodeID}\n`);
		});
	}

	/**
	 * Stop broker. If set transport, transport.disconnect will be called.
	 * 
	 * @memberOf ServiceBroker
	 */
	stop() {
		return Promise.resolve()
		.then(() => {
			// Call service `started` handlers
			this.services.forEach(service => {
				if (service && service.schema && _.isFunction(service.schema.stopped)) {
					service.schema.stopped.call(service);
				}
			});
		})
		.catch(err => {
			this.logger.error("Unable to stop all services!", err);
		})
		.then(() => {
			if (this.transit) {
				return this.transit.disconnect();
			}
		})
		.then(() => {
			this.logger.info(`Broker stopped. NodeID: ${this.nodeID}\n`);

			process.removeListener("beforeExit", this._closeFn);
			process.removeListener("exit", this._closeFn);
			process.removeListener("SIGINT", this._closeFn);
		});
	}

	/**
	 * Start REPL mode
	 * 
	 * @memberof ServiceBroker
	 */
	repl() {
		/* istanbul ignore next */
		startREPL(this);
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

		if (Array.isArray(fileMask))
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
	 * @param {any} nodeID		NodeID if it is on a remote server/node
	 * @param {any} action		action schema
	 * 
	 * @memberOf ServiceBroker
	 */
	registerAction(nodeID, action) {

		// Wrap middlewares
		if (!nodeID)
			this.wrapAction(action);
		
		const res = this.serviceRegistry.register(nodeID, action);
		if (res) {
			this.emitLocal(`register.action.${action.name}`, { nodeID, action });
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

		//return this.wrapContextInvoke(action, handler);
		action.handler = handler;

		return action;
	}

	/**
	 * Deregister an action on a local server. 
	 * It will be called when a remote node disconnected. 
	 * 
	 * @param {any} nodeID		NodeID if it is on a remote server/node
	 * @param {any} action		action schema
	 * 
	 * @memberOf ServiceBroker
	 */
	deregisterAction(nodeID, action) {
		this.serviceRegistry.deregister(nodeID, action);
	}

	/**
	 * Register internal actions
	 * 
	 * @memberOf ServiceBroker
	 */
	registerInternalActions() {
		const addAction = (name, handler) => {
			this.registerAction(LOCAL_NODE_ID, {
				name,
				cache: false,
				handler: Promise.method(handler)
			});
		};

		addAction("$node.list", () => {
			let res = [];
			const localNode = this.transit.getNodeInfo();
			localNode.id = null;
			localNode.available = true;
			res.push(localNode);
			
			this.transit.nodes.forEach(node => {
				//res.push(pick(node, ["nodeID", "available"]));
				res.push(node);
			});

			return res;
		});

		addAction("$node.services", () => {
			let res = [];
			this.services.forEach(service => {
				res.push(pick(service, ["name", "version", "settings"]));
			});

			return res;
		});

		addAction("$node.actions", ctx => {
			return this.serviceRegistry.getActionList(ctx.params.onlyLocal, ctx.params.skipInternal, ctx.params.withEndpoints);
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
		return this.serviceRegistry.hasAction(actionName);
	}	

	/**
	 * Get an action by name
	 * 
	 * @param {any} actionName
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
	 * Check has available action handler
	 * 
	 * @param {any} actionName
	 * @returns
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
	 * Create a new Context instance
	 * 
	 * @param {Object} action 
	 * @param {String?} nodeID 
	 * @param {Object?} params 
	 * @param {Object?} opts 
	 * @returns {Context}
	 * 
	 * @memberof ServiceBroker
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
					const errMsg = `Action '${actionName}' is not available on '${opts.nodeID}' node!`;
					this.logger.warn(errMsg);
					return Promise.reject(new E.ServiceNotFoundError(errMsg, { action: actionName, nodeID: opts.nodeID }));
				}

			} else {
				// Find action by name
				let actions = this.serviceRegistry.findAction(actionName);
				if (actions == null) {
					const errMsg = `Action '${actionName}' is not registered!`;
					this.logger.warn(errMsg);
					return Promise.reject(new E.ServiceNotFoundError(errMsg, { action: actionName }));
				}
				
				// Get an endpoint
				endpoint = actions.nextAvailable();
				if (endpoint == null) {
					const errMsg = `Action '${actionName}' is not available!`;
					this.logger.warn(errMsg);
					return Promise.reject(new E.ServiceNotFoundError(errMsg, { action: actionName }));
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
			if (ctx.timeout > 0)
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
			if (ctx.timeout > 0)
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
			err = new E.MoleculerError(err);
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
				this.logger.warn(`Action '${actionName}' call timed out on '${nodeID}'!`);
				this.logger.warn(`Recall '${actionName}' action (retry: ${ctx.retryCount + 1})...`);

				opts.ctx = ctx; // Reuse this context
				return this.call(actionName, ctx.params, opts);
			}
		}

		// Need it? this.logger.error("Action request error!", err);

		this._finishCall(ctx, err);

		// Handle fallback response
		if (opts.fallbackResponse) {
			this.logger.warn(`Action '${actionName}' returns fallback response!`);
			if (_.isFunction(opts.fallbackResponse))
				return opts.fallbackResponse(ctx);
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
	emitLocal(eventName, payload, sender) {
		this.logger.debug("Event emitted:", eventName);		

		return this.bus.emit(eventName, payload, sender);
	}
	
}

// Set version of Moleculer
ServiceBroker.prototype.MOLECULER_VERSION = require("../package.json").version;

module.exports = ServiceBroker;