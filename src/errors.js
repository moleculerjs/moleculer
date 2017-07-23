/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const ExtendableError = require("es6-error");

/**
 * Custom Moleculer Error class
 * 
 * @class MoleculerError
 * @extends {Error}
 */
class MoleculerError extends ExtendableError {
	/**
	 * Creates an instance of MoleculerError.
	 * 
	 * @param {any} message
	 * 
	 * @memberOf MoleculerError
	 */
	constructor(message, code, type, data) {
		super(message);
		this.code = code || 500;
		this.type = type;
		this.data = data;
	}
}


/**
 * 'Service not found' Error message
 * 
 * @class ServiceNotFoundError
 * @extends {Error}
 */
class ServiceNotFoundError extends MoleculerError {
	/**
	 * Creates an instance of ServiceNotFoundError.
	 * 
	 * @param {String} action
	 * @param {String} nodeID
	 * 
	 * @memberOf ServiceNotFoundError
	 */
	constructor(action, nodeID) {
		let msg;
		if (nodeID) 
			msg = `Service '${action}' is not available on '${nodeID || "<local>"}' node!`;
		else 
			msg = `Service '${action}' is not available!`;
			
		super(msg, 404, null, {
			action,
			nodeID
		});
	}
}

/**
 * 'Request timed out' Error message
 * 
 * @class RequestTimeoutError
 * @extends {Error}
 */
class RequestTimeoutError extends MoleculerError {
	/**
	 * Creates an instance of RequestTimeoutError.
	 * 
	 * @param {String} action
	 * @param {String} nodeID
	 * 
	 * @memberOf RequestTimeoutError
	 */
	constructor(action, nodeID) {
		super(`Request timed out when call '${action}' action on '${nodeID || "<local>"}' node!`, 504, null, {
			action,
			nodeID
		});
	}
}

/**
 * 'Request skipped for timeout' Error message
 * 
 * @class RequestSkippedError
 * @extends {Error}
 */
class RequestSkippedError extends MoleculerError {
	/**
	 * Creates an instance of RequestSkippedError.
	 * 
	 * @param {String} action
	 * @param {String} nodeID
	 * 
	 * @memberOf RequestSkippedError
	 */
	constructor(action, nodeID) {
		super(`Calling '${action}' is skipped because timeout reached on '${nodeID || "<local>"}' node!`, 514, null, {
			action, 
			nodeID
		});
	}
}

/**
 * 'Parameters of action call validation error
 * 
 * @class ValidationError
 * @extends {Error}
 */
class ValidationError extends MoleculerError {
	/**
	 * Creates an instance of ValidationError.
	 * 
	 * @param {String} message
	 * @param {any} type
	 * @param {any} data
	 * 
	 * @memberOf ValidationError
	 */
	constructor(message, type, data) {
		super(message, 422, type, data);
	}
}

/**
 * 'Max request call level!' Error message
 * 
 * @class MaxCallLevelError
 * @extends {Error}
 */
class MaxCallLevelError extends MoleculerError {
	/**
	 * Creates an instance of MaxCallLevelError.
	 * 
	 * @param {String} action
	 * 
	 * @memberOf MaxCallLevelError
	 */
	constructor(data) {
		super("Request level is reached the limit!", 500, null, data);
	}
}


module.exports = {
	MoleculerError,

	ServiceNotFoundError,
	ValidationError,
	RequestTimeoutError,
	RequestSkippedError,
	MaxCallLevelError
};