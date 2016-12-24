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
	 * @param {object} opts
	 * 
	 * @memberOf Cacher
	 */
	constructor(opts) {
		this.opts = _.defaultsDeep(opts, {
			prefix: "",
			ttl: null
		});

		this.prefix = this.opts.prefix;
	}

	init(broker) {
		this.broker = broker;
		if (this.broker)
			this.logger = broker.getLogger("CACHER");
	}

	close() {
	}

	get(key) {
		/* istanbul ignore next */
		throw new Error("Not implemented method!");
	}

	set(key, data) {
		/* istanbul ignore next */
		throw new Error("Not implemented method!");
	}

	del(key) {
		/* istanbul ignore next */
		throw new Error("Not implemented method!");
	}

	clean(match) {
		/* istanbul ignore next */
		throw new Error("Not implemented method!");
	}
}

module.exports = Cacher;
