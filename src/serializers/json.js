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
	 * Serializer a JS object to string or Buffer
	 * 
	 * @param {Object} obj
	 * @returns {String|Buffer}
	 * 
	 * @memberOf Serializer
	 */
	serialize(obj) {
		return JSON.stringify(obj);
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
		return JSON.parse(str);
	}
}

module.exports = JSONSerializer;