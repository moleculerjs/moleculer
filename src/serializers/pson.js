/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const BaseSerializer = require("./base");

const PSON = require("pson");

/**
 * MessagePack serializer for Moleculer
 * 
 * https://github.com/dcodeIO/PSON
 * 
 * @class PsonSerializer
 */
class PsonSerializer extends BaseSerializer {

	/**
	 * Creates an instance of PsonSerializer.
	 * 
	 * @memberOf PsonSerializer
	 */
	constructor() {
		super();

		this.pson = new PSON.ProgressivePair();
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
		const res = this.pson.encode(obj).compact();
		return res;
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
		const res = this.pson.decode(str);
		return res;
	}
}

module.exports = PsonSerializer;