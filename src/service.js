"use strict";

let _ = require("lodash");

class Service {

	constructor(broker, node, schema) {

		if (!_.isObject(broker)) 
			throw new Error("Must to set a ServiceBroker instance!");

		if (!_.isObject(schema)) 
			throw new Error("Must pass a service schema in constructor!");
		
		this.name = schema.name;
		this.$schema = schema;
		this.$node = node;
		this.$broker = broker;

		this.$broker.registerService(this.$node, this);
	}

}

module.exports = Service;