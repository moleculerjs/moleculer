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
			this.logger = broker.getLogger("Serializer");
		}*/
	}

	/**
	 * Serializer a JS object to string or Buffer
	 * 
	 * @param {Object} obj
	 * @returns {String|Buffer}
	 * 
	 * @memberOf Serializer
	 */
	serialize(obj) {
		/* istanbul ignore next */
		throw new Error("Not implemented method!");
	}

	/**
	 * Deserialize string/Buffer to JS object
	 * 
	 * @param {String|Buffer} str
	 * @returns {Object}
	 * 
	 * @memberOf Serializer
	 */
	deserialize(str) {
		/* istanbul ignore next */
		throw new Error("Not implemented method!");
	}
	
}

module.exports = Serializer;
