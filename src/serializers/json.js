/*
 * moleculer
 * Copyright (c) 2023 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const BaseSerializer = require("./base");

/**
 * Import types
 *
 * @typedef {import("../service-broker")} ServiceBroker
 * @typedef {import("./json")} JSONSerializerClass
 */

/**
 * JSON serializer for Moleculer
 *
 * @implements {JSONSerializerClass}
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
	 * @returns {Buffer}
	 *
	 * @memberof Serializer
	 */
	serialize(obj) {
		return Buffer.from(JSON.stringify(obj));
	}

	/**
	 * Deserialize Buffer to JS object
	 *
	 * @param {any} buf
	 * @returns {Object}
	 *
	 * @memberof Serializer
	 */
	deserialize(buf) {
		return JSON.parse(buf);
	}
}

module.exports = JSONSerializer;
