/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
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
	 * @memberof JSONSerializer
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
	 * @memberof Serializer
	 */
	serialize(obj) {
		const cache = new WeakSet();
		return JSON.stringify(obj, (key, value) => {
			if (typeof value === "object" && value !== null) {
				if (cache.has(value)) {
					return "[Circular]";
				}
				cache.add(value);
			}
			return value;
		});
	}

	/**
	 * Deserialize Buffer to JS object
	 *
	 * @param {Buffer} buf
	 * @param {String} type of packet
	 * @returns {Object}
	 *
	 * @memberof Serializer
	 */
	deserialize(buf) {
		return JSON.parse(buf);
	}
}

module.exports = JSONSerializer;
