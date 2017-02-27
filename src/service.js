/*
 * moleculer
 * Copyright (c) 2017 Icebob (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

//const _ = require("lodash");
const isFunction = require("lodash/isFunction");
const forIn = require("lodash/forIn");
const isObject = require("lodash/isObject");
const cloneDeep = require("lodash/cloneDeep");

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

		if (!isObject(broker)) {
			throw new Error("Must to set a ServiceBroker instance!");
		}

		if (!isObject(schema)) {
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
		if (isObject(schema.actions)) {

			forIn(schema.actions, (action, name) => {
				if (isFunction(action)) {
					// Wrap to an object
					action = {
						handler: action
					};
				}

				let innerAction = this._createActionHandler(cloneDeep(action), action.handler, name);

				// Register to broker
				broker.registerAction(innerAction);

				// Expose to call `service.actions.find({ ...params })`
				this.actions[name] = (params) => {
					let ctx = new broker.ContextFactory({ broker, action: innerAction, params });
					return innerAction.handler(ctx);
				};
				
			});

		}

		// Event subscriptions
		if (isObject(schema.events)) {

			forIn(schema.events, (event, name) => {
				if (isFunction(event)) {
					event = {
						handler: event
					};
				}
				if (!event.name)
					event.name = event;

				if (!isFunction(event.handler)) {
					throw new Error(`Missing event handler on '${name}' event in '${this.name}' service!`);
				}

				const self = this;
				const handler = function(payload) {
					return event.handler.apply(self, [payload, this.event]);
				};

				broker.on(name, handler);
			});

		}

		// Register methods
		if (isObject(schema.methods)) {

			forIn(schema.methods, (method, name) => {
				/* istanbul ignore next */
				if (["name", "version", "settings", "schema", "broker", "actions", "logger"].indexOf(name) != -1) {
					throw new Error(`Invalid method name '${name}' in '${this.name}' service! Skipping...`);
				}
				this[name] = method.bind(this);
			});

		}

		// Call `created` function from schema
		if (isFunction(this.schema.created)) {
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
		if (!isFunction(handler)) {
			throw new Error(`Missing action handler on '${name}' action in '${this.name}' service!`);
		}

		if (this.settings.appendServiceName !== false)
			action.name = this.name + "." + (action.name || name);
		else
			action.name = action.name || name;

		if (this.version) 
			action.name = `v${this.version}.${action.name}`;

		action.version = this.version;
		action.service = this;
		action.cache = action.cache !== undefined ? action.cache : (this.settings.cache || false);
		action.handler = Promise.method(handler.bind(this));
		//action.handler = handler.bind(this);
		
		return action;
	}

}

module.exports = Service;