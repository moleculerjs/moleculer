/*
 * ice-services
 * Copyright (c) 2017 Norbert Mereg (https://github.com/icebob/ice-services)
 * MIT Licensed
 */

"use strict";

/**
 * 'Service not found' Error message
 * 
 * @class ServiceNotFoundError
 * @extends {Error}
 */
class ServiceNotFoundError extends Error {
	/**
	 * Creates an instance of ServiceNotFoundError.
	 * 
	 * @param {any} message
	 * @param {any} data
	 * 
	 * @memberOf ServiceNotFoundError
	 */
	constructor(message, data) {
		super(message);
		Error.captureStackTrace(this, this.constructor);
		this.name = "ServiceNotFoundError";
		this.message = message;
		if (data) {
			this.data = data;
		}
	}
}

/**
 * 'Service not found' Error message
 * 
 * @class RequestTimeoutError
 * @extends {Error}
 */
class RequestTimeoutError extends Error {
	/**
	 * Creates an instance of RequestTimeoutError.
	 * 
	 * @param {any} message
	 * @param {any} data
	 * 
	 * @memberOf RequestTimeoutError
	 */
	constructor(message, data) {
		super(message);
		Error.captureStackTrace(this, this.constructor);
		this.name = "RequestTimeoutError";
		this.message = message;
		if (data) {
			this.data = data;
		}
	}
}

/**
 * 'Parameters of action call validation error
 * 
 * @class ValidationError
 * @extends {Error}
 */
class ValidationError extends Error {
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
		Error.captureStackTrace(this, this.constructor);
		this.name = "ValidationError";
		this.message = message;
		if (data) {
			this.data = data;
		}
	}
}

module.exports = {
	ServiceNotFoundError,
	ValidationError,
	RequestTimeoutError
};