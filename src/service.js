/*
 * ice-services
 * Copyright (c) 2017 Norbert Mereg (https://github.com/icebob/ice-services)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const Promise = require("bluebird");

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

		if (!_.isObject(broker)) {
			throw new Error("Must to set a ServiceBroker instance!");
		}

		if (!_.isObject(schema)) {
			throw new Error("Must pass a service schema in constructor!");
		}

		if (!schema.name) {
			throw new Error("Service name can't be empty!");
		}
		
		this.name = schema.name;
		this.version = schema.version;
		this.settings = schema.settings || {};
		this.schema = schema;
		this.broker = broker;

		this.logger = this.broker.getLogger(this.name.toUpperCase() + "-SVC");

		this.actions = {}; // external access to actions

		this.broker.registerService(this);

		// Register actions
		if (_.isObject(schema.actions)) {

			_.forIn(schema.actions, (action, name) => {
				if (_.isFunction(action)) {
					action = {
						handler: action
					};
				}

				let innerAction = this._createActionHandler(_.cloneDeep(action), action.handler, name);

				// Expose to call `service.actions.find({ ...params })`
				this.actions[name] = (params) => {
					let ctx = new broker.ContextFactory({ broker, action: innerAction, params });
					return ctx.invoke(action.handler);
					//return Promise.resolve(action.handler(ctx));
				};

				// Register to broker
				broker.registerAction(this, innerAction);
			});

		}

		// Event subscriptions
		if (_.isObject(schema.events)) {

			_.forIn(schema.events, (event, name) => {
				if (_.isFunction(event)) {
					event = {
						handler: event
					};
				}

				if (!_.isFunction(event.handler)) {
					throw new Error(`Missing event handler on '${name}' event in '${this.name}' service!`);
				}

				broker.on(name, event.handler.bind(this));
			});

		}

		// Register methods
		if (_.isObject(schema.methods)) {

			_.forIn(schema.methods, (method, name) => {
				/* istanbul ignore next */
				if (["name", "version", "settings", "schema", "broker", "actions"].indexOf(name) != -1) {
					this.logger.warn(`Invalid method name '${name}' in '${this.name}' service! Skipping...`);
					return;
				}
				this[name] = method.bind(this);
			});

		}

		// Call `created` function from schema
		if (_.isFunction(this.schema.created)) {
			this.broker.callPluginMethod(this, "serviceCreated", this.broker, this);
			this.schema.created.call(this);
		}

	}

	/**
	 * Create an external action handler for broker (internal command!)
	 * 
	 * @param {any} action
	 * @param {any} handler
	 * @param {any} name
	 * @returns
	 * 
	 * @memberOf Service
	 */
	_createActionHandler(action, handler, name) {
		if (!_.isFunction(handler)) {
			throw new Error(`Missing action handler on '${name}' action in '${this.name}' service!`);
		}

		action.name = this.name + "." + (action.name || name);
		action.service = this;
		action.handler = handler.bind(this);

		// Call plugin
		this.broker.callPluginMethod(this, "createActionHandler", this.broker, this, action);

		// Cache
		if (this.broker.cacher) {
			if (action.cache === true || (action.cache === undefined && this.settings.cache === true)) {
				action.cache = true;
				action.handler = this.broker.cacher.wrapHandler(action, action.handler);
			} else
				action.cache = false;
		}
		

		return action;
	}

}

module.exports = Service;