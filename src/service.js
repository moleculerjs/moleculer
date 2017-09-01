/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const isFunction 	= require("lodash/isFunction");
const forIn 		= require("lodash/forIn");
const isObject 		= require("lodash/isObject");
const isNumber 		= require("lodash/isNumber");
const cloneDeep 	= require("lodash/cloneDeep");
const utils 		= require("./utils");

const { ServiceSchemaError } = require("./errors");

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
	 * @memberOf Service
	 */
	constructor(broker, schema) {

		if (!isObject(broker))
			throw new ServiceSchemaError("Must set a ServiceBroker instance!");

		if (!isObject(schema))
			throw new ServiceSchemaError("Must pass a service schema in constructor!");

		if (schema.mixins) {
			schema = Service.applyMixins(schema);
		}

		if (!schema.name)
			throw new ServiceSchemaError("Service name can't be empty!");

		this.name = schema.name;
		this.version = schema.version;
		this.settings = schema.settings || {};
		this.schema = schema;
		this.broker = broker;

		if (broker) {
			this.Promise = broker.Promise;
		}

		this.logger = this.broker.getLogger("service", this.name, this.version);

		this.actions = {}; // external access to actions

		//Service item for Registry
		const registryItem = {
			name: this.name,
			version: this.version,
			settings: this.settings,
			actions: {},
			events: {}
		};

		// Register actions
		if (isObject(schema.actions)) {

			forIn(schema.actions, (action, name) => {
				if (action === false)
					return;

				let innerAction = this._createAction(action, name);

				registryItem.actions[innerAction.name] = broker.wrapAction(innerAction);

				// Expose to call `service.actions.find({ ...params })`
				this.actions[name] = (params, opts) => {
					const ctx = broker.ContextFactory.create(broker, innerAction, null, params, opts || {});
					return innerAction.handler(ctx);
				};

			});

		}

		// Event subscriptions
		if (isObject(schema.events)) {

			forIn(schema.events, (event, name) => {
				if (isFunction(event) || Array.isArray(event)) {
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
				event.handler = function(payload, sender, eventName) {
					if (isFunction(handler)) {
						const p = handler.apply(self, [payload, sender, eventName]);
						if (utils.isPromise(p))
							p.catch(err => self.logger.error(err));
					} else if (Array.isArray(handler)) {
						handler.forEach(fn => {
							const p = fn.apply(self, [payload, sender, eventName]);
							if (utils.isPromise(p))
								p.catch(err => self.logger.error(err));
						});
					}

					return null;
				};

				registryItem.events[event.name] = event;
			});

		}

		// Register methods
		if (isObject(schema.methods)) {

			forIn(schema.methods, (method, name) => {
				/* istanbul ignore next */
				if (["name", "version", "settings", "schema", "broker", "actions", "logger", "created", "started", "stopped"].indexOf(name) != -1) {
					throw new ServiceSchemaError(`Invalid method name '${name}' in '${this.name}' service!`);
				}
				this[name] = method.bind(this);
			});

		}

		// Register service
		broker.addService(this);
		broker.registry.registerLocalService(registryItem);


		// Create lifecycle runner methods
		this.created = () => {
			if (isFunction(this.schema.created)) {
				this.schema.created.call(this);
			} else if (Array.isArray(this.schema.created)) {
				this.schema.created.forEach(fn => fn.call(this));
			}
		};

		this.started = () => {
			if (isFunction(this.schema.started))
				return this.Promise.method(this.schema.started).call(this);

			if (Array.isArray(this.schema.started)) {
				return this.schema.started.map(fn => this.Promise.method(fn.bind(this))).reduce((p, fn) => p.then(fn), this.Promise.resolve());
			}

			return this.Promise.resolve();
		};

		this.stopped = () => {
			if (isFunction(this.schema.stopped))
				return this.Promise.method(this.schema.stopped).call(this);

			if (Array.isArray(this.schema.stopped)) {
				return this.schema.stopped.reverse().map(fn => this.Promise.method(fn.bind(this))).reduce((p, fn) => p.then(fn), this.Promise.resolve());
			}

			return this.Promise.resolve();
		};

		// Call the created event handler
		this.created();
	}

	/**
	 * Create an external action handler for broker (internal command!)
	 *
	 * @param {any} actionDef
	 * @param {any} name
	 * @returns
	 *
	 * @private
	 * @memberOf Service
	 */
	_createAction(actionDef, name) {
		let action;
		if (isFunction(actionDef)) {
			// Wrap to an object
			action = {
				handler: actionDef
			};
		} else if (isObject(actionDef)) {
			action = cloneDeep(actionDef);
		} else {
			throw new ServiceSchemaError(`Invalid action definition in '${name}' action in '${this.name}' service!`);
		}

		let handler = action.handler;
		if (!isFunction(handler)) {
			throw new ServiceSchemaError(`Missing action handler on '${name}' action in '${this.name}' service!`);
		}

		if (this.settings.$noServiceNamePrefix !== true)
			action.name = this.name + "." + (action.name || name);
		else
			action.name = action.name || name;

		if (this.version && this.settings.$noVersionPrefix !== true) {
			if (isNumber(this.version))
				action.name = `v${this.version}.${action.name}`;
			else
				action.name = `${this.version}.${action.name}`;
		}

		//action.origName = name;
		action.service = this;
		action.cache = action.cache !== undefined ? action.cache : (this.settings.$cache || false);
		action.handler = this.Promise.method(handler.bind(this));

		return action;
	}

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
			const mixedSchema = mixins.reverse().reduce((s, mixin) => {
				if (mixin.mixins)
					mixin = Service.applyMixins(mixin);

				return utils.mergeSchemas(s, mixin);
			}, {});

			return utils.mergeSchemas(mixedSchema, schema);
		}

		/* istanbul ignore next */
		return schema;
	}
}

module.exports = Service;
