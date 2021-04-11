/*
 * moleculer
 * Copyright (c) 2021 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const BaseSerializer = require("./base");
const _ = require("lodash");

/**
 * CBOR serializer for Moleculer
 *
 * https://github.com/kriszyp/cbor-x
 *
 * @class CborSerializer
 */
class CborSerializer extends BaseSerializer {
	/**
	 * Creates an instance of CborSerializer.
	 *
	 * @memberof Serializer
	 */
	constructor(opts) {
		super(opts);
		this.opts = _.defaultsDeep(opts, { useRecords: false });
	}

	/**
	 * Initialize Serializer
	 *
	 * @param {any} broker
	 *
	 * @memberof Serializer
	 */
	init(broker) {
		super.init(broker);

		try {
			const Cbor = require("cbor-x");
			this.encoder = new Cbor.Encoder(this.opts);
		} catch(err) {
			/* istanbul ignore next */
			this.broker.fatal("The 'cbor-x' package is missing! Please install it with 'npm install cbor-x --save' command!", err, true);
		}
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
		const res = this.encoder.encode(obj);
		return res;
	}

	/**
	 * Deserialize Buffer to JS object
	 *
	 * @param {Buffer} str
	 * @returns {Object}
	 *
	 * @memberof Serializer
	 */
	deserialize(buf) {
		const res = this.encoder.decode(buf);
		return res;
	}
}

module.exports = CborSerializer;
