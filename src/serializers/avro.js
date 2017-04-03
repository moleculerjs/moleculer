/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const avro = require("avsc");
const BaseSerializer = require("./base");

const schema = {
	name: "Request",
	type: "record",
	fields: [
	]
};

/**
 * Avro serializer for Moleculer
 * 
 * https://github.com/mtth/avsc
 * 
 * @class AvroSerializer
 */
class AvroSerializer extends BaseSerializer {

	/**
	 * Creates an instance of AvroSerializer.
	 * 
	 * @memberOf AvroSerializer
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
		const schema = avro.Type.forValue(obj);
		const t = schema.toBuffer(obj);
		return t;
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

module.exports = AvroSerializer;