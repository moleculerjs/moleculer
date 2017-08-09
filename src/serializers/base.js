/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

/**
 * Abstract serializer class
 * 
 * @class Serializer
 */
class Serializer {

	/**
	 * Creates an instance of Serializer.
	 * 
	 * @memberOf Serializer
	 */
	constructor() {
	}

	/**
	 * Initialize Serializer
	 * 
	 * @param {any} broker
	 * 
	 * @memberOf Serializer
	 */
	init(broker) {
		this.broker = broker;
		/*if (this.broker) {
			this.logger = broker.getLogger("serializer");
		}*/
	}

	/**
	 * Serializer a JS object to Buffer
	 * 
	 * @param {Object} obj
	 * @param {String} type of packet
	 * @returns {Buffer}
	 * 
	 * @memberOf Serializer
	 */
	serialize(/*obj, type*/) {
		/* istanbul ignore next */
		throw new Error("Not implemented method!");
	}

	/**
	 * Deserialize Buffer to JS object
	 * 
	 * @param {Buffer} buf
	 * @param {String} type of packet
	 * @returns {Object}
	 * 
	 * @memberOf Serializer
	 */
	deserialize(/*buf, type*/) {
		/* istanbul ignore next */
		throw new Error("Not implemented method!");
	}
	
}

module.exports = Serializer;
