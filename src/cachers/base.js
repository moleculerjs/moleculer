"use strict";

let _ 			= require("lodash");
/**
 * Abstract cacher class
 * 
 * @class Cacher
 */
class Cacher {

	/**
	 * Creates an instance of Cacher.
	 * 
	 * @param {ServiceBroker} broker
	 * @param {object} opts
	 * 
	 * @memberOf Cacher
	 */
	constructor(broker, opts) {
		this.opts = opts || {
			prefix: "",
			ttl: null
		};

		this.prefix = this.opts.prefix;
	}

	init(broker) {
		this.broker = broker;
		this.logger = broker.getLogger("CACHER");
	}

	get(key) {
		throw new Error("Not implemented method!");
	}

	set(key, data) {
		throw new Error("Not implemented method!");
	}

	del(key) {
		throw new Error("Not implemented method!");
	}

	clean(match) {
		throw new Error("Not implemented method!");
	}
}

module.exports = Cacher;
