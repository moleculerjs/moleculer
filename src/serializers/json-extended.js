/*
 * moleculer
 * Copyright (c) 2021 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const BaseSerializer = require("./base");
//const { isDate } = require("../utils");
const { isDate, isRegExp } = require("util").types;

const PREFIX_BIGINT = "[[BI]]";
const PREFIX_DATE = "[[DT]]";
const PREFIX_BUFFER = "[[BF]]";
const PREFIX_REGEXP = "[[RE]]";

/**
 * JSON Extended serializer for Moleculer
 *
 * @class JSONExtSerializer
 */
class JSONExtSerializer extends BaseSerializer {
	/**
	 * Creates an instance of JSONExtSerializer.
	 *
	 * @memberof JSONExtSerializer
	 */
	constructor(opts) {
		super();

		this.opts = opts || {};
	}

	/**
	 * JSON stringify replacer.
	 *
	 * @param {String} key
	 * @param {any} value
	 */
	replacer(key, value) {
		if (value == null) return value;

		const v = this[key];

		if (typeof v == "bigint") {
			return PREFIX_BIGINT + v;
		} else if (isDate(v)) {
			return PREFIX_DATE + v.valueOf();
		} else if (isRegExp(v)) {
			return PREFIX_REGEXP + v.flags + "|" + v.source;
		} else if (Buffer.isBuffer(v)) {
			return PREFIX_BUFFER + v.toString("base64");
		}
		return value;
	}

	/**
	 * JSON.parse reviver.
	 *
	 * @param {String} key
	 * @param {any} value
	 */
	reviver(key, value) {
		if (typeof value === "string" && value.charAt(0) === "[") {
			if (value.startsWith(PREFIX_BIGINT)) {
				return BigInt(value.slice(PREFIX_BIGINT.length));
			} else if (value.startsWith(PREFIX_DATE)) {
				return new Date(Number(value.slice(PREFIX_DATE.length)));
			} else if (value.startsWith(PREFIX_REGEXP)) {
				const p = value.slice(PREFIX_REGEXP.length).split("|");
				const flags = p.shift();
				// eslint-disable-next-line security/detect-non-literal-regexp
				return new RegExp(p.join("|"), flags);
			} else if (value.startsWith(PREFIX_BUFFER)) {
				return Buffer.from(value.slice(PREFIX_BUFFER.length), "base64");
			}
		}
		return value;
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
		return Buffer.from(JSON.stringify(obj, this.replacer));
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
		return JSON.parse(buf, this.reviver);
	}
}

module.exports = JSONExtSerializer;
