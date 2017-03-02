/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
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
	constructor(message, name) {
		super(message);
		this.code = 410;
		this.action = name;
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
		this.code = 408;
		this.nodeID = nodeID;
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
		this.code = 422;
		this.data = data;
	}
}

/**
 * Custom Error class
 * 
 * @class CustomError
 * @extends {Error}
 */
class CustomError extends ExtendableError {
	/**
	 * Creates an instance of CustomError.
	 * 
	 * @param {any} message
	 * 
	 * @memberOf CustomError
	 */
	constructor(message, code, data) {
		super(message);
		this.code = code || 500;
		this.data = data;
	}
}

module.exports = {
	CustomError,
	ServiceNotFoundError,
	ValidationError,
	RequestTimeoutError
};