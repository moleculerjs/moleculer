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
	 * @param {String} message
	 * @param {String} action
	 * 
	 * @memberOf ServiceNotFoundError
	 */
	constructor(message, action) {
		super(message);
		this.code = 501;
		this.action = action;
	}
}

/**
 * 'Request timed out' Error message
 * 
 * @class RequestTimeoutError
 * @extends {Error}
 */
class RequestTimeoutError extends ExtendableError {
	/**
	 * Creates an instance of RequestTimeoutError.
	 * 
	 * @param {String} action
	 * @param {String} nodeID
	 * 
	 * @memberOf RequestTimeoutError
	 */
	constructor(action, nodeID) {
		super(`Request timed out when call '${action}' action on '${nodeID}' node!`);
		this.code = 504;
		this.nodeID = nodeID;
		this.action = action;
		//this.data = data;
	}
}
/**
 * 'Request skipped for timeout' Error message
 * 
 * @class RequestTimeoutError
 * @extends {Error}
 */
class RequestSkippedError extends ExtendableError {
	/**
	 * Creates an instance of RequestSkippedError.
	 * 
	 * @param {String} action
	 * 
	 * @memberOf RequestSkippedError
	 */
	constructor(action) {
		super(`Action '${action}' call is skipped because timeout reached!`);
		this.code = 514;
		//this.nodeID = nodeID;
		this.action = action;
		//this.data = data;
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
	RequestTimeoutError,
	RequestSkippedError
};