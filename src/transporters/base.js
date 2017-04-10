/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

// Prefix for logger
const LOG_PREFIX = "TX";

/**
 * Base Transporter class
 * 
 * @class BaseTransporter
 */
class BaseTransporter {

	/**
	 * Creates an instance of BaseTransporter.
	 * 
	 * @param {any} opts
	 * 
	 * @memberOf BaseTransporter
	 */
	constructor(opts) {
		this.opts = opts || {};
		this.connected = false;

		this.prefix = "MOL";
		
		if (this.opts.prefix) {
			this.prefix = this.opts.prefix;
		}
	}

	/**
	 * Init transporter
	 * 
	 * @param {any} broker
	 * 
	 * @memberOf BaseTransporter
	 */
	init(broker, messageHandler) {
		this.broker = broker;
		this.nodeID = broker.nodeID;
		this.logger = broker.getLogger(LOG_PREFIX);
		this.messageHandler = messageHandler;
	}

	/**
	 * Connect to the transporter server
	 * 
	 * @memberOf BaseTransporter
	 */
	connect() {
		/* istanbul ignore next */
		throw new Error("Not implemented!");
	}

	/**
	 * Disconnect from the transporter server
	 * 
	 * @memberOf BaseTransporter
	 */
	disconnect() {
		/* istanbul ignore next */
		throw new Error("Not implemented!");
	}

	/**
	 * Subscribe to a command
	 * 
	 * @param {String} cmd 
	 * @param {String} nodeID 
	 * 
	 * @memberOf BaseTransporter
	 */
	subscribe(/*cmd, nodeID*/) {
		/* istanbul ignore next */
		throw new Error("Not implemented!");
	}

	/**
	 * Publish a packet
	 * 
	 * @param {Packet} packet
	 * 
	 * @memberOf BaseTransporter
	 */
	publish(/*packet*/) {
		/* istanbul ignore next */
		throw new Error("Not implemented!");
	}

	/**
	 * Get topic name from command & target nodeID
	 * 
	 * @param {any} cmd 
	 * @param {any} nodeID 
	 * 
	 * @memberOf BaseTransporter
	 */
	getTopicName(cmd, nodeID) {
		return this.prefix + "." + cmd + (nodeID ? "." + nodeID : "");
	}

}

module.exports = BaseTransporter;