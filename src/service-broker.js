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
const fs 				= require("fs");

const Transit 			= require("./transit");
const Registry 			= require("./registry");
const E 				= require("./errors");
const utils 			= require("./utils");
const Logger 			= require("./logger");
const Validator 		= require("./validator");
const BrokerStatistics 	= require("./statistics");

const Cachers 			= require("./cachers");
const Transporters 		= require("./transporters");
const Serializers 		= require("./serializers");
const RoundRobinStrategy = require("./strategies/round-robin");

// Circuit-breaker states
const { CIRCUIT_HALF_OPEN } 	= require("./constants");


const defaultConfig = {
	namespace: "",
	nodeID: null,

	logger: null,
	logLevel: null,

	transporter: null,
	requestTimeout: 0 * 1000,
	requestRetry: 0,
	maxCallLevel: 0,
	heartbeatInterval: 5,
	heartbeatTimeout: 15,

	registry: {
		strategy: new RoundRobinStrategy(),
		preferLocal: true
	},

	circuitBreaker: {
		enabled: false,
		maxFailures: 3,
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
	internalServices: true,

	hotReload: false,

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

		// Internal event bus
		this.internalEvents = new EventEmitter2({
			wildcard: true,
			maxListeners: 100
		});

		// Internal maps
		this.services = [];

		// Service registry
		this.registry = new Registry(this);

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

		// Register internal actions
		if (this.options.internalServices)
			this.registerInternalServices();

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
			else if (opt.startsWith("amqp://"))
				TransporterClass = Transporters.AMQP;

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
			} else {
				// Should call changed because we didn't call the `createService`.
				this.servicesChanged(true);
			}

		} else {
			svc = this.createService(schema);
		}

		if (svc) {
			svc.__filename = fName;
			if (this.options.hotReload)
				this.watchService(svc);
		}

		return svc;
	}

	/**
	 * Watch a service file and hot reload if it changed.
	 *
	 * @param {Service} service
	 * @memberof ServiceBroker
	 */
	watchService(service) {
		if (service.__filename) {
			const debouncedHotReload = _.debounce(this.hotReloadService.bind(this), 500);

			this.logger.info(`Watching '${service.name}' service file...`);

			// Better: https://github.com/paulmillr/chokidar
			const watcher = fs.watch(service.__filename, (eventType, filename) => {
				this.logger.warn(`The ${filename} is changed: ${eventType}`);

				watcher.close();
				debouncedHotReload(service);
			});
		}
	}

	/**
	 * Hot reload a service
	 *
	 * @param {Service} service
	 * @returns {Service} Reloaded service instance
	 *
	 * @memberof ServiceBroker
	 */
	hotReloadService(service) {
		this.logger.info(`Hot reloading '${service.name}' service...`, service.__filename);

		utils.clearRequireCache(service.__filename);

		return this.destroyService(service)
			.then(() => this.loadService(service.__filename))
			.then(svc => svc.started.call(svc).then(() => svc))
			.then(svc => {
				this.logger.info(`Service '${svc.name}' is reloaded.`);
				return svc;
			});
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

		this.servicesChanged(true);

		return service;
	}

	addService(service) {
		this.services.push(service);
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
				this.registry.unregisterService(service.name, service.version);

				this.logger.info(`Service '${service.name}' is destroyed!`);
				this.servicesChanged(true);
			});
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
	 * Register internal services
	 *
	 * @memberOf ServiceBroker
	 */
	registerInternalServices() {
		this.createService(require("./internals")(this));
	}

	/**
	 * It will be called when a new local or remote service
	 * is registered or unregistered.
	 *
	 * @memberof ServiceBroker
	 */
	servicesChanged(localService = false) {
		this.broadcastLocal("$services.changed", { localService });

		// Should notify remote nodes, because our service list is changed.
		if (localService && this.transit && this.transit.connected) {
			this.transit.sendNodeInfo();
		}
	}

	/**
	 * Get a local service by name
	 *
	 * @param {String} serviceName
	 * @returns {Service}
	 *
	 * @memberOf ServiceBroker
	 */
	getLocalService(serviceName) {
		return this.services.find(service => service.name == serviceName);
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
				endpoint = this.registry.getActionEndpointByNodeId(actionName, opts.nodeID);
				if (!endpoint) {
					this.logger.warn(`Service '${actionName}' is not available on '${opts.nodeID}' node!`);
					return Promise.reject(new E.ServiceNotFoundError(actionName, opts.nodeID));
				}

			} else {
				// Find action by name
				let actions = this.registry.getActionEndpoints(actionName);
				if (actions == null) {
					this.logger.warn(`Service '${actionName}' is not registered!`);
					return Promise.reject(new E.ServiceNotFoundError(actionName));
				}

				// Get an endpoint
				endpoint = actions.next();
				if (endpoint == null) {
					const errMsg = `Service '${actionName}' is not available!`;
					this.logger.warn(errMsg);
					return Promise.reject(new E.ServiceNotFoundError(actionName));
				}
			}
		}

		// Expose action info
		let action = endpoint.action;
		let nodeID = endpoint.id;

		// Create context
		let ctx;
		if (opts.ctx != null) {
			// Reused context
			ctx = opts.ctx;
			ctx.nodeID = nodeID;
			ctx.action = action;
		} else {
			// New root context
			ctx = this.ContextFactory.create(this, action, nodeID, params, opts);
		}

		if (this.options.maxCallLevel > 0 && ctx.level > this.options.maxCallLevel) {
			return this.Promise.reject(new E.MaxCallLevelError({ level: ctx.level, action: actionName }));
		}

		// Call handler or transfer request
		let p;
		if (endpoint.local) {
			this.logger.debug(`Call '${actionName}' action on local node.`);

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
			this.logger.debug(`Call remote '${actionName}' action on '${nodeID}' node.`);

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
			err = new E.RequestTimeoutError(actionName, nodeID);

		err.ctx = ctx;

		if (nodeID != this.nodeID) {
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
	 * Emit an event (grouped & balanced global event)
	 *
	 * @param {string} eventName
	 * @param {any} payload
	 * @param {String=} groupName
	 * @returns
	 *
	 * @memberOf ServiceBroker
	 */
	emit(eventName, payload, groupName) {
		const endpoints = this.registry.events.getBalancedEndpoints(eventName, groupName);

		// Grouping remote events (minimize network traffic)
		const groupedEP = {};

		endpoints.forEach(([ep, group]) => {
			if (ep.id == this.nodeID) {
				// Local service, call handler
				ep.event.handler(payload, this.nodeID, eventName);
			} else {
				const e = groupedEP[ep.id];
				if (e)
					e.push(group);
				else
					groupedEP[ep.id] = [group];
			}
		});

		// Remote service
		_.forIn(groupedEP, (groups, nodeID) => {
			return this.transit.sendEvent(nodeID, eventName, payload, groups);
		});

	}

	/**
	 * Emit an event for all local & remote services
	 *
	 * @param {string} eventName
	 * @param {any} payload
	 * @returns
	 *
	 * @memberOf ServiceBroker
	 */
	broadcast(eventName, payload) {
		const endpoints = this.registry.events.getAllEndpoints(eventName);

		// Send to remote services
		endpoints.forEach(ep => {
			if (ep.id != this.nodeID) {
				return this.transit.sendEvent(ep.id, eventName, payload);
			}
		});

		// Send to local services
		return this.broadcastLocal(eventName, payload);
	}

	/**
	 * Emit an event for all local services
	 *
	 * @param {string} eventName
	 * @param {any} payload
	 * @param {Array<String>?} groups
	 * @param {String?} nodeID
	 * @returns
	 *
	 * @memberOf ServiceBroker
	 */
	broadcastLocal(eventName, payload, groups, nodeID) {
		this.logger.debug("Event emitted locally:", eventName);

		return this.registry.events.emitLocalServices(eventName, payload, null, nodeID || this.nodeID);
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
 * Default configuration
 */
ServiceBroker.defaultConfig = defaultConfig;

module.exports = ServiceBroker;
