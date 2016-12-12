"use strict";

let _ = require("lodash");
let Context = require("./context");
let utils = require("./utils");

class Service {

	constructor(broker, schema) {

		if (!_.isObject(broker)) 
			throw new Error("Must to set a ServiceBroker instance!");

		if (!_.isObject(schema)) 
			throw new Error("Must pass a service schema in constructor!");

		if (!schema.name) 
			throw new Error("Service name can't be empty!");
		
		this.name = schema.name;
		this.version = schema.version;
		this.$settings = schema.settings || {};
		this.$schema = schema;
		this.$broker = broker;

		this.actions = {}; // external access to actions

		this.$broker.registerService(this);

		// Register actions
		if (_.isObject(schema.actions)) {

			_.forIn(schema.actions, (action, name) => {
				if (_.isFunction(action)) {
					action = {
						handler: action
					};
				}

				let innerAction = this._createActionHandler(action, action.handler, name);

				this.actions[name] = (params) => {
					let ctx = new Context({ service: this, action: innerAction, params });
					return action.handler(ctx);
				};

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

				broker.subscribeEvent(this, this._createEventHandler(event, event.handler, name));
			});

		}

		// Register methods
		if (_.isObject(schema.methods)) {

			_.forIn(schema.methods, (method, name) => {
				if (["name", "version", "actions"].indexOf(name) != -1) {
					console.warn(`Invalid method name '${name}' in '${this.name}' service! Skipping...`);
					return;
				}
				/*if (["toJSON", "getByID", "modelResolver"].indexOf(name) != -1) {
					console.warn(`This method name '${name}' is prohibited under 'methods' object. If you want to override the built-in method, please declare in the root of service schema! Skipping...`);
					return;
				}*/
				this[name] = method.bind(this);
			});

		}

	}

	_createActionHandler(action, handler, name) {
		if (!_.isFunction(handler)) 
			throw new Error(`Missing action handler on '${name}' action in '${this.name}' service!`);

		action.name = this.name + "." + name;
		action.service = this;
		action.handler = handler.bind(this);

		// Cache
		if (action.cache === true || (action.cahe === undefined && this.$settings.cache === true)) {
			action.handler = utils.cachingWrapper(this.$broker, action, action.handler);
		}

		return action;
	}

	_createEventHandler(event, handler, name) {
		if (!_.isFunction(handler)) 
			throw new Error(`Missing event handler on '${name}' event in '${this.name}' service!`);

		event.name = name;
		event.service = this;
		event.handler = handler.bind(this);

		return event;
	}

}

module.exports = Service;