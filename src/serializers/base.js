/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const P = require("../packets");

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

	serializeCustomFields(type, obj) {
		switch(type) {
			case P.PACKET_INFO: {
				obj.services = JSON.stringify(obj.services);
				obj.events = JSON.stringify(obj.events);
				if (obj.config)
					obj.config = JSON.stringify(obj.config);
				break;
			}
			case P.PACKET_EVENT: {
				obj.data = JSON.stringify(obj.data);
				break;
			}
			case P.PACKET_REQUEST: {
				obj.params = JSON.stringify(obj.params);
				obj.meta = JSON.stringify(obj.meta);
				break;
			}
			case P.PACKET_RESPONSE: {
				if (obj.data)
					obj.data = JSON.stringify(obj.data);
				if (obj.error && obj.error.data)
					obj.error.data = JSON.stringify(obj.error.data);
				break;
			}
		}

		return obj;
	}

	deserializeCustomFields(type, obj) {
		switch(type) {
			case P.PACKET_INFO: {
				obj.services = JSON.parse(obj.services);
				obj.events = JSON.parse(obj.events);
				if (obj.config)
					obj.config = JSON.parse(obj.config);
				break;
			}
			case P.PACKET_EVENT: {
				obj.data = JSON.parse(obj.data);
				break;
			}
			case P.PACKET_REQUEST: {
				obj.params = JSON.parse(obj.params);
				obj.meta = JSON.parse(obj.meta);
				break;
			}
			case P.PACKET_RESPONSE: {
				if (obj.data)
					obj.data = JSON.parse(obj.data);
				if (obj.error && obj.error.data)
					obj.error.data = JSON.parse(obj.error.data);
				break;
			}
		}

		return obj;
	}
}

module.exports = Serializer;
