/*
 * moleculer
 * Copyright (c) 2020 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const { ServiceSchemaError, MoleculerError } = require("./errors");
const { isObject, isFunction, flatten, functionArguments, deprecate } = require("./utils");

/**
 * Wrap a handler Function to an object with a `handler` property.
 *
 * @param {Function|Object} o
 * @returns {Object}
 */
function wrapToHandler(o) {
	return isFunction(o) ? { handler: o } : o;
}

/**
 * Wrap any value to an array.
 * @param {any} o
 * @returns {Array}
 */
function wrapToArray(o) {
	return Array.isArray(o) ? o : [o];
}

function isNewSignature(args) {
	return args.length > 0 && ["ctx", "context"].indexOf(args[0].toLowerCase()) !== -1;
}

/**
 * Service class
 *
 * @class Service
 */
class Service {
	/**
	 * Creates an instance of Service by schema.
	 *
	 * @param {ServiceBroker} 	broker	broker of service
	 * @param {Object} 			schema	schema of service
	 *
	 * @memberof Service
	 */
	constructor(broker, schema) {
		if (!isObject(broker)) throw new ServiceSchemaError("Must set a ServiceBroker instance!");

		this.broker = broker;

		if (broker) this.Promise = broker.Promise;
		if (schema) this.parseServiceSchema(schema);
	}

	/**
	 * Parse Service schema & register as local service
	 *
	 * @param {Object} schema of Service
	 */
	parseServiceSchema(schema) {
		if (!isObject(schema))
			throw new ServiceSchemaError(
				"The service schema can't be null. Maybe is it not a service schema?"
			);

		this.originalSchema = _.cloneDeep(schema);

		if (schema.mixins) {
			schema = this.applyMixins(schema);
		}

		if (isFunction(schema.merged)) {
			schema.merged.call(this, schema);
		} else if (Array.isArray(schema.merged)) {
			schema.merged.forEach(fn => fn.call(this, schema));
		}

		this.broker.callMiddlewareHookSync("serviceCreating", [this, schema]);

		if (!schema.name) {
			/* eslint-disable-next-line no-console */
			console.error(
				"Service name can't be empty! Maybe it is not a valid Service schema. Maybe is it not a service schema?",
				{ schema }
			);
			throw new ServiceSchemaError(
				"Service name can't be empty! Maybe it is not a valid Service schema. Maybe is it not a service schema?",
				{ schema }
			);
		}

		this.name = schema.name;
		this.version = schema.version;
		this.settings = schema.settings || {};
		this.metadata = schema.metadata || {};
		this.schema = schema;

		this.fullName = Service.getVersionedFullName(
			this.name,
			this.settings.$noVersionPrefix !== true ? this.version : undefined
		);

		this.logger = this.broker.getLogger(this.fullName, {
			svc: this.name,
			ver: this.version
		});

		this.actions = {}; // external access to actions
		this.events = {}; // external access to event handlers.

		// Service item for Registry
		const serviceSpecification = {
			name: this.name,
			version: this.version,
			fullName: this.fullName,
			settings: this._getPublicSettings(this.settings),
			metadata: this.metadata,
			actions: {},
			events: {}
		};

		// Register methods
		if (isObject(schema.methods)) {
			_.forIn(schema.methods, (method, name) => {
				/* istanbul ignore next */
				if (
					[
						"name",
						"version",
						"settings",
						"metadata",
						"dependencies",
						"schema",
						"broker",
						"actions",
						"logger",
						"created",
						"started",
						"stopped",
						"_start",
						"_stop",
						"_init",
						"applyMixins"
					].indexOf(name) !== -1 ||
					name.startsWith("mergeSchema")
				) {
					throw new ServiceSchemaError(
						`Invalid method name '${name}' in '${this.name}' service!`
					);
				}

				this._createMethod(method, name);
			});
		}

		// Register actions
		if (isObject(schema.actions)) {
			_.forIn(schema.actions, (action, name) => {
				if (action === false) return;

				let innerAction = this._createAction(action, name);

				serviceSpecification.actions[innerAction.name] = innerAction;

				const wrappedHandler = this.broker.middlewares.wrapHandler(
					"localAction",
					innerAction.handler,
					innerAction
				);

				// Expose to be callable as `this.actions.find({ ...params })`
				const ep = this.broker.registry.createPrivateActionEndpoint(innerAction);
				this.actions[name] = (params, opts) => {
					let ctx;
					if (opts && opts.ctx) {
						// Reused context (in case of retry)
						ctx = opts.ctx;
					} else {
						ctx = this.broker.ContextFactory.create(
							this.broker,
							ep,
							params,
							opts || {}
						);
					}
					return wrappedHandler(ctx);
				};
			});
		}

		// Event subscriptions
		if (isObject(schema.events)) {
			_.forIn(schema.events, (event, name) => {
				const innerEvent = this._createEvent(event, name);
				serviceSpecification.events[innerEvent.name] = innerEvent;

				// Expose to be callable as `this.events[''](params, opts);
				this.events[innerEvent.name] = (params, opts) => {
					let ctx;
					if (opts && opts.ctx) {
						// Reused context (in case of retry)
						ctx = opts.ctx;
					} else {
						const ep = {
							id: this.broker.nodeID,
							event: innerEvent
						};
						ctx = this.broker.ContextFactory.create(
							this.broker,
							ep,
							params,
							opts || {}
						);
					}
					ctx.eventName = name;
					ctx.eventType = "emit";
					ctx.eventGroups = [innerEvent.group || this.name];

					return innerEvent.handler(ctx);
				};
			});
		}

		this._serviceSpecification = serviceSpecification;

		// Initialize
		this._init();
	}

	/**
	 * Return a service settings without protected properties.
	 *
	 * @param {Object?} settings
	 */
	_getPublicSettings(settings) {
		if (settings && Array.isArray(settings.$secureSettings)) {
			return _.omit(settings, [].concat(settings.$secureSettings, ["$secureSettings"]));
		}

		return settings;
	}

	/**
	 * Initialize service. It called `created` handler in schema
	 *
	 * @private
	 * @memberof Service
	 */
	_init() {
		this.logger.debug(`Service '${this.fullName}' is creating...`);
		if (isFunction(this.schema.created)) {
			this.schema.created.call(this);
		} else if (Array.isArray(this.schema.created)) {
			this.schema.created.forEach(fn => fn.call(this));
		}

		this.broker.addLocalService(this);

		this.broker.callMiddlewareHookSync("serviceCreated", [this]);

		this.logger.debug(`Service '${this.fullName}' created.`);
	}

	/**
	 * Start service
	 *
	 * @returns {Promise}
	 * @private
	 * @memberof Service
	 */
	_start() {
		this.logger.debug(`Service '${this.fullName}' is starting...`);
		return this.Promise.resolve()
			.then(() => {
				return this.broker.callMiddlewareHook("serviceStarting", [this]);
			})
			.then(() => {
				// Wait for dependent services
				if (this.schema.dependencies)
					return this.waitForServices(
						this.schema.dependencies,
						this.settings.$dependencyTimeout || this.broker.options.dependencyTimeout,
						this.settings.$dependencyInterval || this.broker.options.dependencyInterval
					);
			})
			.then(() => {
				if (isFunction(this.schema.started))
					return this.Promise.method(this.schema.started).call(this);

				if (Array.isArray(this.schema.started)) {
					return this.schema.started
						.map(fn => this.Promise.method(fn.bind(this)))
						.reduce((p, fn) => p.then(() => fn()), this.Promise.resolve());
				}
			})
			.then(() => {
				// Register service
				return this.broker.registerLocalService(this._serviceSpecification);
			})
			.then(() => {
				return this.broker.callMiddlewareHook("serviceStarted", [this]);
			})
			.then(() => this.logger.info(`Service '${this.fullName}' started.`));
	}

	/**
	 * Stop service
	 *
	 * @returns {Promise}
	 * @private
	 * @memberof Service
	 */
	_stop() {
		this.logger.debug(`Service '${this.fullName}' is stopping...`);
		return this.Promise.resolve()
			.then(() => {
				return this.broker.callMiddlewareHook("serviceStopping", [this], { reverse: true });
			})
			.then(() => {
				if (isFunction(this.schema.stopped))
					return this.Promise.method(this.schema.stopped).call(this);

				if (Array.isArray(this.schema.stopped)) {
					const arr = Array.from(this.schema.stopped).reverse();
					return arr
						.map(fn => this.Promise.method(fn.bind(this)))
						.reduce((p, fn) => p.then(() => fn()), this.Promise.resolve());
				}

				return this.Promise.resolve();
			})
			.then(() => {
				return this.broker.callMiddlewareHook("serviceStopped", [this], { reverse: true });
			})
			.then(() => this.logger.info(`Service '${this.fullName}' stopped.`));
	}

	/**
	 * Create an external action handler for broker (internal command!)
	 *
	 * @param {Object|Function} actionDef
	 * @param {String} name
	 * @returns {Object}
	 *
	 * @private
	 * @memberof Service
	 */
	_createAction(actionDef, name) {
		let action;
		if (isFunction(actionDef)) {
			// Wrap to an object
			action = {
				handler: actionDef
			};
		} else if (isObject(actionDef)) {
			action = _.cloneDeep(actionDef);
		} else {
			throw new ServiceSchemaError(
				`Invalid action definition in '${name}' action in '${this.fullName}' service!`
			);
		}

		let handler = action.handler;
		if (!isFunction(handler)) {
			throw new ServiceSchemaError(
				`Missing action handler on '${name}' action in '${this.fullName}' service!`
			);
		}

		action.rawName = action.name || name;
		if (this.settings.$noServiceNamePrefix !== true)
			action.name = this.fullName + "." + action.rawName;
		else action.name = action.rawName;

		if (action.cache === undefined && this.settings.$cache !== undefined) {
			action.cache = this.settings.$cache;
		}

		action.service = this;
		action.handler = this.Promise.method(handler.bind(this));

		return action;
	}

	/**
	 * Create an internal service method.
	 *
	 * @param {Object|Function} methodDef
	 * @param {String} name
	 * @returns {Object}
	 */
	_createMethod(methodDef, name) {
		let method;
		if (isFunction(methodDef)) {
			// Wrap to an object
			method = {
				handler: methodDef
			};
		} else if (isObject(methodDef)) {
			method = methodDef;
		} else {
			throw new ServiceSchemaError(
				`Invalid method definition in '${name}' method in '${this.fullName}' service!`
			);
		}

		if (!isFunction(method.handler)) {
			throw new ServiceSchemaError(
				`Missing method handler on '${name}' method in '${this.fullName}' service!`
			);
		}

		method.name = name;
		method.service = this;
		method.handler = method.handler.bind(this);

		this[name] = this.broker.middlewares.wrapHandler("localMethod", method.handler, method);

		return method;
	}

	/**
	 * Create an event subscription for broker
	 *
	 * @param {Object|Function} eventDef
	 * @param {String} name
	 * @returns {Object}
	 *
	 * @private
	 * @memberof Service
	 */
	_createEvent(eventDef, name) {
		let event;
		if (isFunction(eventDef) || Array.isArray(eventDef)) {
			event = {
				handler: eventDef
			};
		} else if (isObject(eventDef)) {
			event = _.cloneDeep(eventDef);
		} else {
			throw new ServiceSchemaError(
				`Invalid event definition in '${name}' event in '${this.fullName}' service!`
			);
		}

		if (!isFunction(event.handler) && !Array.isArray(event.handler)) {
			throw new ServiceSchemaError(
				`Missing event handler on '${name}' event in '${this.fullName}' service!`
			);
		}

		// Detect new or legacy parameter list of event handler
		// Legacy: handler(payload, sender, eventName)
		// New: handler(ctx)
		let handler;
		if (isFunction(event.handler)) {
			const args = functionArguments(event.handler);
			handler = this.Promise.method(event.handler);
			handler.__newSignature = event.context === true || isNewSignature(args);
		} else if (Array.isArray(event.handler)) {
			handler = event.handler.map(h => {
				const args = functionArguments(h);
				h = this.Promise.method(h);
				h.__newSignature = event.context === true || isNewSignature(args);
				return h;
			});
		}

		if (!event.name) event.name = name;

		event.service = this;
		const self = this;
		if (isFunction(handler)) {
			// Call single handler
			event.handler = function (ctx) {
				return handler.apply(
					self,
					handler.__newSignature ? [ctx] : [ctx.params, ctx.nodeID, ctx.eventName, ctx]
				);
			};
		} else if (Array.isArray(handler)) {
			// Call multiple handler
			event.handler = function (ctx) {
				return self.Promise.all(
					handler.map(fn =>
						fn.apply(
							self,
							fn.__newSignature ? [ctx] : [ctx.params, ctx.nodeID, ctx.eventName, ctx]
						)
					)
				);
			};
		}

		return event;
	}

	/**
	 * Call a local event handler. Useful for unit tests.
	 *
	 * @param {String} eventName
	 * @param {any?} params
	 * @param {Object?} opts
	 */
	emitLocalEventHandler(eventName, params, opts) {
		if (!this.events[eventName])
			return Promise.reject(
				new MoleculerError(
					`No '${eventName}' registered local event handler`,
					500,
					"NOT_FOUND_EVENT",
					{ eventName }
				)
			);

		return this.events[eventName](params, opts);
	}

	/**
	 * Getter of current Context.
	 * @returns {Context?}
	 *
	 * @memberof Service
	 *
	get currentContext() {
		return this.broker.getCurrentContext();
	}*/

	/**
	 * Setter of current Context
	 *
	 * @memberof Service
	 *
	set currentContext(ctx) {
		this.broker.setCurrentContext(ctx);
	}*/

	/**
	 * Wait for other services
	 *
	 * @param {String|Array<String>} serviceNames
	 * @param {Number} timeout Timeout in milliseconds
	 * @param {Number} interval Check interval in milliseconds
	 * @returns {Promise}
	 * @memberof Service
	 */
	waitForServices(serviceNames, timeout, interval) {
		return this.broker.waitForServices(serviceNames, timeout, interval, this.logger);
	}

	/**
	 * Apply `mixins` list in schema. Merge the schema with mixins schemas. Returns with the mixed schema
	 *
	 * @param {Schema} schema
	 * @returns {Schema}
	 *
	 * @memberof Service
	 */
	applyMixins(schema) {
		if (schema.mixins) {
			const mixins = Array.isArray(schema.mixins) ? schema.mixins : [schema.mixins];
			if (mixins.length > 0) {
				const mixedSchema = Array.from(mixins)
					.reverse()
					.reduce((s, mixin) => {
						if (mixin.mixins) mixin = this.applyMixins(mixin);

						return s ? this.mergeSchemas(s, mixin) : mixin;
					}, null);

				return this.mergeSchemas(mixedSchema, schema);
			}
		}

		/* istanbul ignore next */
		return schema;
	}

	/**
	 * Merge two Service schema
	 *
	 * @param {Object} mixinSchema		Mixin schema
	 * @param {Object} svcSchema 		Service schema
	 * @returns {Object} Mixed schema
	 *
	 * @memberof Service
	 */
	mergeSchemas(mixinSchema, svcSchema) {
		const res = _.cloneDeep(mixinSchema);
		if (!svcSchema) return res;
		const mods = _.cloneDeep(svcSchema);
		if (!mixinSchema) return mods;

		Object.keys(mods).forEach(key => {
			if ((key === "name" || key === "version") && mods[key] !== undefined) {
				// Simple overwrite
				res[key] = mods[key];
			} else if (key === "settings") {
				// Merge with defaultsDeep
				res[key] = this.mergeSchemaSettings(mods[key], res[key]);
			} else if (key === "metadata") {
				// Merge with defaultsDeep
				res[key] = this.mergeSchemaMetadata(mods[key], res[key]);
			} else if (key === "hooks") {
				// Merge & concat
				res[key] = this.mergeSchemaHooks(mods[key], res[key] || {});
			} else if (key === "actions") {
				// Merge with defaultsDeep
				res[key] = this.mergeSchemaActions(mods[key], res[key] || {});
			} else if (key === "methods") {
				// Overwrite
				res[key] = this.mergeSchemaMethods(mods[key], res[key]);
			} else if (key === "events") {
				// Merge & concat by groups
				res[key] = this.mergeSchemaEvents(mods[key], res[key] || {});
			} else if (["merged", "created", "started", "stopped"].indexOf(key) !== -1) {
				// Concat lifecycle event handlers
				res[key] = this.mergeSchemaLifecycleHandlers(mods[key], res[key]);
			} else if (key === "mixins") {
				// Concat mixins
				res[key] = this.mergeSchemaUniqArray(mods[key], res[key]);
			} else if (key === "dependencies") {
				// Concat mixins
				res[key] = this.mergeSchemaUniqArray(mods[key], res[key]);
			} else {
				const customFnName = "mergeSchema" + key.replace(/./, key[0].toUpperCase()); // capitalize first letter
				// TODO: add middleware hook
				if (isFunction(this[customFnName])) {
					res[key] = this[customFnName](mods[key], res[key]);
				} else {
					res[key] = this.mergeSchemaUnknown(mods[key], res[key]);
				}
			}
		});

		return res;
	}

	/**
	 * Merge `settings` property in schema
	 *
	 * @param {Object} src Source schema property
	 * @param {Object} target Target schema property
	 *
	 * @returns {Object} Merged schema
	 */
	mergeSchemaSettings(src, target) {
		if ((target && target.$secureSettings) || (src && src.$secureSettings)) {
			const srcSS = src && src.$secureSettings ? src.$secureSettings : [];
			const targetSS = target && target.$secureSettings ? target.$secureSettings : [];
			if (!target) target = {};

			target.$secureSettings = _.uniq([].concat(srcSS, targetSS));
		}

		return _.defaultsDeep(src, target);
	}

	/**
	 * Merge `metadata` property in schema
	 *
	 * @param {Object} src Source schema property
	 * @param {Object} target Target schema property
	 *
	 * @returns {Object} Merged schema
	 */
	mergeSchemaMetadata(src, target) {
		return _.defaultsDeep(src, target);
	}

	/**
	 * Merge `mixins` property in schema
	 *
	 * @param {Object} src Source schema property
	 * @param {Object} target Target schema property
	 *
	 * @returns {Object} Merged schema
	 */
	mergeSchemaUniqArray(src, target) {
		return _.uniqWith(_.compact(flatten([src, target])), _.isEqual);
	}

	/**
	 * Merge `dependencies` property in schema
	 *
	 * @param {Object} src Source schema property
	 * @param {Object} target Target schema property
	 *
	 * @returns {Object} Merged schema
	 */
	mergeSchemaDependencies(src, target) {
		return this.mergeSchemaUniqArray(src, target);
	}

	/**
	 * Merge `hooks` property in schema
	 *
	 * @param {Object} src Source schema property
	 * @param {Object} target Target schema property
	 *
	 * @returns {Object} Merged schema
	 */
	mergeSchemaHooks(src, target) {
		Object.keys(src).forEach(k => {
			if (target[k] == null) target[k] = {};

			Object.keys(src[k]).forEach(k2 => {
				const modHook = wrapToArray(src[k][k2]);
				const resHook = wrapToArray(target[k][k2]);

				target[k][k2] = _.compact(
					flatten(k === "before" ? [resHook, modHook] : [modHook, resHook])
				);
			});
		});

		return target;
	}

	/**
	 * Merge `actions` property in schema
	 *
	 * @param {Object} src Source schema property (real schema)
	 * @param {Object} target Target schema property (mixin schema)
	 *
	 * @returns {Object} Merged schema
	 */
	mergeSchemaActions(src, target) {
		Object.keys(src).forEach(k => {
			if (src[k] === false && target[k]) {
				delete target[k];
				return;
			}

			const srcAction = wrapToHandler(src[k]);
			const targetAction = wrapToHandler(target[k]);

			if (srcAction && srcAction.hooks && targetAction && targetAction.hooks) {
				Object.keys(srcAction.hooks).forEach(k => {
					const modHook = wrapToArray(srcAction.hooks[k]);
					const resHook = wrapToArray(targetAction.hooks[k]);

					srcAction.hooks[k] = _.compact(
						flatten(k === "before" ? [resHook, modHook] : [modHook, resHook])
					);
				});
			}

			target[k] = _.defaultsDeep(srcAction, targetAction);
		});

		return target;
	}

	/**
	 * Merge `methods` property in schema
	 *
	 * @param {Object} src Source schema property
	 * @param {Object} target Target schema property
	 *
	 * @returns {Object} Merged schema
	 */
	mergeSchemaMethods(src, target) {
		return Object.assign(target || {}, src || {});
	}

	/**
	 * Merge `events` property in schema
	 *
	 * @param {Object} src Source schema property
	 * @param {Object} target Target schema property
	 *
	 * @returns {Object} Merged schema
	 */
	mergeSchemaEvents(src, target) {
		Object.keys(src).forEach(k => {
			const modEvent = wrapToHandler(src[k]);
			const resEvent = wrapToHandler(target[k]);

			let handler = _.compact(
				flatten([resEvent ? resEvent.handler : null, modEvent ? modEvent.handler : null])
			);
			if (handler.length === 1) handler = handler[0];

			target[k] = _.defaultsDeep(modEvent, resEvent);
			target[k].handler = handler;
		});

		return target;
	}

	/**
	 * Merge `started`, `stopped`, `created` event handler properties in schema
	 *
	 * @param {Object} src Source schema property
	 * @param {Object} target Target schema property
	 *
	 * @returns {Object} Merged schema
	 */
	mergeSchemaLifecycleHandlers(src, target) {
		return _.compact(flatten([target, src]));
	}

	/**
	 * Merge unknown properties in schema
	 *
	 * @param {Object} src Source schema property
	 * @param {Object} target Target schema property
	 *
	 * @returns {Object} Merged schema
	 */
	mergeSchemaUnknown(src, target) {
		if (src !== undefined) return src;

		return target;
	}

	/**
	 * Return a versioned full service name.
	 * @param {String} name
	 * @param {String|Number?} version
	 */
	static getVersionedFullName(name, version) {
		if (version != null)
			return (typeof version == "number" ? "v" + version : version) + "." + name;

		return name;
	}
}

module.exports = Service;
