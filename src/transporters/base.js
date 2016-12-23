"use strict";

/**
 * 
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
	 * 
	 * 
	 * @param {any} broker
	 * 
	 * @memberOf BaseTransporter
	 */
	init(broker) {
		this.broker = broker;
	}

	/**
	 * 
	 * 
	 * 
	 * @memberOf BaseTransporter
	 */
	connect() {

	}

	/**
	 * 
	 * 
	 * 
	 * @memberOf BaseTransporter
	 */
	disconnect() {

	}

	/**
	 * 
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
	 * 
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
	 * 
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

}

module.exports = BaseTransporter;