/*
 * ice-services
 * Copyright (c) 2016 Norbert Mereg (https://github.com/icebob/ice-services)
 * MIT Licensed
 */

"use strict";

/**
 * Abstract/Base transporter class
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
	}

	/**
	 * Init transporter
	 * 
	 * @param {any} broker
	 * 
	 * @memberOf BaseTransporter
	 */
	init(broker) {
		this.broker = broker;
	}

	/**
	 * Connect to transporter server
	 * 
	 * @memberOf BaseTransporter
	 */
	connect() {
		return Promise.resolve();
	}

	/**
	 * Disconnect from transporter server
	 * 
	 * @memberOf BaseTransporter
	 */
	disconnect() {

	}

	/**
	 * Send an event to remote nodes
	 * 
	 * @param {any} eventName
	 * @param {any} args
	 * 
	 * @memberOf BaseTransporter
	 */
	emit(eventName, ...args) {
		/* istanbul ignore next */
		throw new Error("Not implemented!");
	}

	/**
	 * Subscribe to an event
	 * 
	 * @param {any} eventName
	 * @param {any} handler
	 * 
	 * @memberOf BaseTransporter
	 */
	subscribe(eventName, handler) {
		/* istanbul ignore next */
		throw new Error("Not implemented!");
	}

	/**
	 * Send a request to a remote node
	 * 
	 * @param {any} nodeID
	 * @param {any} ctx
	 * @returns
	 * 
	 * @memberOf BaseTransporter
	 */
	request(nodeID, ctx) {
		/* istanbul ignore next */
		return new Promise((resolve, reject) => {
			reject("Not implemented");
		});
	}

	/**
	 * Send a hearthbeat to remote nodes
	 * 
	 * @memberOf BaseTransporter
	 */
	sendHeartbeat() {
		/* istanbul ignore next */
		throw new Error("Not implemented!");
	}

}

module.exports = BaseTransporter;