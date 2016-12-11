"use strict";

let _ = require("lodash");

class Service {

	constructor(broker, node, schema) {

		if (!_.isObject(broker)) 
			throw new Error("Must to set a ServiceBroker instance!");

		if (!_.isObject(schema)) 
			throw new Error("Must pass a service schema in constructor!");

		if (!schema.name) 
			throw new Error("Service name can't be empty!");
		
		this.name = schema.name;
		this.$settings = schema.settings || {};
		this.$schema = schema;
		this.$node = node || broker.internalNode;
		this.$broker = broker;

		this.$broker.registerService(this.$node, this);

		// Register actions
		if (_.isObject(schema.actions)) {

			_.forIn(schema.actions, (action, name) => {
				if (_.isFunction(action)) {
					action = {
						handler: action
					};
				}

				if (!_.isFunction(action.handler)) 
					throw new Error(`Missing action handler on '${name}' action in '${this.name}' service!`);

				action.name = this.name + "." + name;
				action.service = this;
				action.handler = action.handler.bind(this);

				broker.registerAction(this.$node, this, action);
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

				if (!_.isFunction(event.handler)) 
					throw new Error(`Missing event handler on '${name}' event in '${this.name}' service!`);

				event.name = name;
				event.service = this;
				event.handler = event.handler.bind(this);

				broker.subscribeEvent(this.$node, this, event);
			});

		}


	}

}

module.exports = Service;