/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const utils = require("./utils");

const { ServiceSchemaError, GracefulStopTimeoutError } = require("./errors");

/**
 * Main Service class
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
		if (!_.isObject(broker))
			throw new ServiceSchemaError("Must set a ServiceBroker instance!");

		this.broker = broker;

		if (broker) {
			this.Promise = broker.Promise;
		}

		if (schema)
			this.parseServiceSchema(schema);
	}

	/**
	 * Parse Service schema & register as local service
	 * @param {Object} schema of Service
	 */
	parseServiceSchema(schema) {
		if (!_.isObject(schema))
			throw new ServiceSchemaError("Must pass a service schema in constructor!");

		if (schema.mixins) {
			schema = Service.applyMixins(schema);
		}

		if (!schema.name)
			throw new ServiceSchemaError("Service name can't be empty!");

		this.name = schema.name;
		this.version = schema.version;
		this.settings = schema.settings || {};
		this.metadata = schema.metadata || {};

		this.schema = schema;

		const versionedName = (this.version ? (typeof(this.version) == "number" ? "v" + this.version : this.version) + "." : "") + this.name;

		this.logger = this.broker.getLogger(versionedName, {
			svc: this.name,
			ver: this.version
		});

		this._activeContexts = [];

		this.actions = {}; // external access to actions

		//Service item for Registry
		const serviceSpecification = {
			name: this.name,
			version: this.version,
			settings: this.settings,
			metadata: this.metadata,
			actions: {},
			events: {}
		};

		// Register actions
		if (_.isObject(schema.actions)) {

			_.forIn(schema.actions, (action, name) => {
				if (action === false)
					return;

				let innerAction = this._createAction(action, name);

				serviceSpecification.actions[innerAction.name] = this.broker.wrapAction(innerAction);

				// Expose to call `service.actions.find({ ...params })`
				this.actions[name] = (params, opts) => {
					const ctx = this.broker.ContextFactory.create(this.broker, innerAction, null, params, opts || {});
					const contextDispose = (ret) => {
						if (ctx.tracked)
							ctx.dispose();

						return ret;
					};
					const contextDisposeCatch = (ret) => this.Promise.reject(contextDispose(ret));

					return innerAction.handler(ctx)
						.then(contextDispose)
						.catch(contextDisposeCatch);
				};

			});

		}

		// Event subscriptions
		if (_.isObject(schema.events)) {

			_.forIn(schema.events, (event, name) => {
				if (_.isFunction(event) || Array.isArray(event)) {
					event = {
						handler: event
					};
				}
				if (!event.name)
					event.name = name;

				if (!event.handler) {
					throw new ServiceSchemaError(`Missing event handler on '${name}' event in '${this.name}' service!`);
				}

				event.service = this;
				const handler = event.handler;
				const self = this;
				event.handler = function (payload, sender, eventName) {
					if (_.isFunction(handler)) {
						const p = handler.apply(self, [payload, sender, eventName]);
						// TODO: Track event handler started

						// Handle async-await returns
						if (utils.isPromise(p)) {
							/* istanbul ignore next */
							p.catch(err => self.logger.error(err));
						} // TODO: Cleanup event tracking

					} else if (Array.isArray(handler)) {
						handler.forEach(fn => {
							const p = fn.apply(self, [payload, sender, eventName]);
							// TODO: Track event handler started

							// Handle async-await returns
							if (utils.isPromise(p)) {
								/* istanbul ignore next */
								p.catch(err => self.logger.error(err));
							} // TODO: Cleanup event tracking
						});
					}

					return null;
				};

				serviceSpecification.events[event.name] = event;
			});

		}

		// Register methods
		if (_.isObject(schema.methods)) {

			_.forIn(schema.methods, (method, name) => {
				/* istanbul ignore next */
				if (["name", "version", "settings", "metadata", "dependencies", "schema", "broker", "actions", "logger", "created", "started", "stopped", "_start", "_stop", "_init"].indexOf(name) != -1) {
					throw new ServiceSchemaError(`Invalid method name '${name}' in '${this.name}' service!`);
				}
				this[name] = method.bind(this);
			});
		}

		this._serviceSpecification = serviceSpecification;

		// Initialize
		this._init();
	}

	/**
	 * Initialize service. It called `created` handler in schema
	 *
	 * @private
	 * @memberof Service
	 */
	_init() {
		if (_.isFunction(this.schema.created)) {
			this.schema.created.call(this);
		} else if (Array.isArray(this.schema.created)) {
			this.schema.created.forEach(fn => fn.call(this));
		}

		this.broker.addLocalService(this);
	}

	/**
	 * Start service
	 *
	 * @returns {Promise}
	 * @private
	 * @memberof Service
	 */
	_start() {
		return this.Promise.resolve()
			.then(() => {
				// Wait for dependent services
				if (this.schema.dependencies)
					return this.waitForServices(this.schema.dependencies, this.settings.$dependencyTimeout || 0);
			})
			.then(() => {
				if (_.isFunction(this.schema.started))
					return this.Promise.method(this.schema.started).call(this);

				if (Array.isArray(this.schema.started)) {
					return this.schema.started
						.map(fn => this.Promise.method(fn.bind(this)))
						.reduce((p, fn) => p.then(fn), this.Promise.resolve());
				}
			})
			.then(() => {
				// Register service
				this.broker.registerLocalService(this._serviceSpecification);
			});
	}

	/**
	 * Stop service
	 *
	 * @returns {Promise}
	 * @private
	 * @memberof Service
	 */
	_stop() {
		return new this.Promise((resolve) => {
			const timeout = setTimeout(() => {
				this.logger.error(new GracefulStopTimeoutError(this));
				resolve();
			}, this.settings.$gracefulStopTimeout || this.broker.options.gracefulStopTimeout);

			let first = true;
			const checkForContexts = () => {
				if (this._activeContexts.length === 0) {
					clearTimeout(timeout);
					resolve();
				} else {
					if (first) {
						this.logger.warn(`Waiting for ${this._activeContexts.length} active context(s)...`);
						first = false;
					}
					setTimeout(checkForContexts, 100);
				}
			};
			setImmediate(checkForContexts);
		}).finally(() => {
			if (_.isFunction(this.schema.stopped))
				return this.Promise.method(this.schema.stopped).call(this);

			if (Array.isArray(this.schema.stopped)) {
				return this.schema.stopped
					.reverse()
					.map(fn => this.Promise.method(fn.bind(this)))
					.reduce((p, fn) => p.then(fn), this.Promise.resolve());
			}

			return this.Promise.resolve();
		});
	}

	/**
	 * Create an external action handler for broker (internal command!)
	 *
	 * @param {any} actionDef
	 * @param {any} name
	 * @returns
	 *
	 * @private
	 * @memberof Service
	 */
	_createAction(actionDef, name) {
		let action;
		if (_.isFunction(actionDef)) {
			// Wrap to an object
			action = {
				handler: actionDef
			};
		} else if (_.isObject(actionDef)) {
			action = _.cloneDeep(actionDef);
		} else {
			throw new ServiceSchemaError(`Invalid action definition in '${name}' action in '${this.name}' service!`);
		}

		let handler = action.handler;
		if (!_.isFunction(handler)) {
			throw new ServiceSchemaError(`Missing action handler on '${name}' action in '${this.name}' service!`);
		}

		if (this.settings.$noServiceNamePrefix !== true)
			action.name = this.name + "." + (action.name || name);
		else
			action.name = action.name || name;

		if (this.version && this.settings.$noVersionPrefix !== true) {
			if (_.isNumber(this.version))
				action.name = `v${this.version}.${action.name}`;
			else
				action.name = `${this.version}.${action.name}`;
		}

		//action.origName = name;
		action.service = this;
		action.cache = action.cache !== undefined ? action.cache : (this.settings.$cache || false);
		action.handler = this.Promise.method(handler.bind(this));

		// action metrics options by default
		action.metrics = _.defaultsDeep(action.metrics, { params: false, meta: true });

		return action;
	}

	_addActiveContext(ctx) {
		this._activeContexts.push(ctx);
	}

	/**
	 * Remove active context from the list
	 * @param {Context} ctx
	 * @private
	 * @memberof Service
	 */
	_removeActiveContext(ctx) {
		const idx = this._activeContexts.indexOf(ctx);
		if (idx !== -1) {
			this._activeContexts.splice(idx, 1);
		}
	}

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
	 * @static
	 * @param {Schema} schema
	 * @returns {Schema}
	 *
	 * @memberof Service
	 */
	static applyMixins(schema) {
		if (schema.mixins) {
			const mixins = Array.isArray(schema.mixins) ? schema.mixins : [schema.mixins];
			if (mixins.length > 0) {
				const mixedSchema = mixins.reverse().reduce((s, mixin) => {
					if (mixin.mixins)
						mixin = Service.applyMixins(mixin);

					return s ? Service.mergeSchemas(s, mixin) : mixin;
				}, null);

				return Service.mergeSchemas(mixedSchema, schema);
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
	static mergeSchemas(mixinSchema, svcSchema) {
		function updateProp(propName, target, source) {
			if (source[propName] !== undefined)
				target[propName] = source[propName];
		}

		const wrapToHander = function wrapToHander(o) {
			return _._.isFunction(o) ? { handler: o } : o;
		};

		const res = _.cloneDeep(mixinSchema);
		const mods = _.cloneDeep(svcSchema);

		Object.keys(mods).forEach(key => {
			if (["settings", "metadata"].indexOf(key) !== -1) {
				// Merge with defaultsDeep
				res[key] = _.defaultsDeep(mods[key], res[key]);

			} else if (["actions"].indexOf(key) !== -1) {
				// Merge with defaultsDeep
				if (res[key] == null)
					res[key] = {};

				Object.keys(mods[key]).forEach(k => {
					const modAction = wrapToHander(mods[key][k]);
					const resAction = wrapToHander(res[key][k]);

					res[key][k] = _.defaultsDeep(modAction, resAction);
				});

			} else if (["methods"].indexOf(key) !== -1) {
				// Overwrite
				res[key] = _.assign(res[key], mods[key]);

			} else if (["events"].indexOf(key) !== -1) {
				// Merge & concat by groups
				if (res[key] == null)
					res[key] = {};

				Object.keys(mods[key]).forEach(k => {
					const modEvent = wrapToHander(mods[key][k]);
					const resEvent = wrapToHander(res[key][k]);

					const handler = _.compact(_.flatten([resEvent ? resEvent.handler : null, modEvent ? modEvent.handler : null]));

					res[key][k] = _.defaultsDeep(modEvent, resEvent);
					res[key][k].handler = handler;

				});
			} else if (["created", "started", "stopped"].indexOf(key) !== -1) {
				// Concat lifecycle event handlers
				res[key] = _.compact(_.flatten([res[key], mods[key]]));

			} else if (["mixins", "dependencies"].indexOf(key) !== -1) {
				// Concat mixins
				res[key] = _.compact(_.flatten([mods[key], res[key]]));

			} else {
				// Overwrite
				updateProp(key, res, mods);
			}
		});

		return res;
	}

}

module.exports = Service;
