/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const BaseSerializer  	= require("./base");
/**
 * JSON serializer for Moleculer
 * 
 * @class JSONSerializer
 */
class JSONSerializer extends BaseSerializer {

	/**
	 * Creates an instance of JSONSerializer.
	 * 
	 * @memberOf JSONSerializer
	 */
	constructor() {
		super();
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
	serialize(obj) {
		return JSON.stringify(obj);
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
	deserialize(buf) {
		return JSON.parse(buf);
	}
}

module.exports = JSONSerializer;