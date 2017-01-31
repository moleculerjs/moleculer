/*
 * servicer
 * Copyright (c) 2017 Icebob (https://github.com/icebob/servicer)
 * MIT Licensed
 */

"use strict";

const ExtendableError = require("es6-error");

/**
 * 'Service not found' Error message
 * 
 * @class ServiceNotFoundError
 * @extends {Error}
 */
class ServiceNotFoundError extends ExtendableError {
	/**
	 * Creates an instance of ServiceNotFoundError.
	 * 
	 * @param {any} message
	 * 
	 * @memberOf ServiceNotFoundError
	 */
	constructor(message) {
		super(message);
	}
}

/**
 * 'Service not found' Error message
 * 
 * @class RequestTimeoutError
 * @extends {Error}
 */
class RequestTimeoutError extends ExtendableError {
	/**
	 * Creates an instance of RequestTimeoutError.
	 * 
	 * @param {any} data
	 * @param {any} nodeID
	 * 
	 * @memberOf RequestTimeoutError
	 */
	constructor(data, nodeID) {
		super(`Request timed out when call '${data.action}' action on '${nodeID}' node!`);
		this.data = data;
	}
}

/**
 * 'Parameters of action call validation error
 * 
 * @class ValidationError
 * @extends {Error}
 */
class ValidationError extends ExtendableError {
	/**
	 * Creates an instance of ValidationError.
	 * 
	 * @param {any} message
	 * @param {any} data
	 * 
	 * @memberOf ValidationError
	 */
	constructor(message, data) {
		super(message);
		if (data)
			this.data = data;
	}
}

module.exports = {
	ServiceNotFoundError,
	ValidationError,
	RequestTimeoutError
};