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
 * @extends {ExtendableError}
 */
class MoleculerError extends ExtendableError {
	/**
	 * Creates an instance of MoleculerError.
	 *
	 * @param {String?} message
	 * @param {Number?} code
	 * @param {String?} type
	 * @param {any} data
	 *
	 * @memberof MoleculerError
	 */
	constructor(message, code, type, data) {
		super(message);
		this.code = code || 500;
		this.type = type;
		this.data = data;
		this.retryable = false;
	}
}

/**
 * Custom Moleculer Error class
 *
 * @class MoleculerRetryableError
 * @extends {MoleculerError}
 */
class MoleculerRetryableError extends MoleculerError {
	/**
	 * Creates an instance of MoleculerRetryableError.
	 *
	 * @param {String?} message
	 * @param {Number?} code
	 * @param {String?} type
	 * @param {any} data
	 *
	 * @memberOf MoleculerRetryableError
	 */
	constructor(message, code, type, data) {
		super(message);
		this.code = code || 500;
		this.type = type;
		this.data = data;
		this.retryable = true;
	}
}

/**
 * Custom Moleculer Error class
 *
 * @class MoleculerServerError
 * @extends {MoleculerRetryableError}
 */
class MoleculerServerError extends MoleculerRetryableError {
}

/**
 * Custom Moleculer Error class
 *
 * @class MoleculerClientError
 * @extends {MoleculerError}
 */
class MoleculerClientError extends MoleculerError {
	/**
	 * Creates an instance of MoleculerClientError.
	 *
	 * @param {String?} message
	 * @param {Number?} code
	 * @param {String?} type
	 * @param {any} data
	 *
	 * @memberOf MoleculerClientError
	 */
	constructor(message, code, type, data) {
		super(message, code || 400, type, data);
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
			msg = `Service '${action}' is not found on '${nodeID || "<local>"}' node!`;
		else
			msg = `Service '${action}' is not found!`;

		super(msg, 404, null, {
			action,
			nodeID
		});

		this.retryable = false;
	}
}

/**
 * 'Service not available' Error message
 *
 * @class ServiceNotAvailable
 * @extends {Error}
 */
class ServiceNotAvailable extends MoleculerError {
	/**
	 * Creates an instance of ServiceNotAvailable.
	 *
	 * @param {String} action
	 * @param {String} nodeID
	 *
	 * @memberOf ServiceNotAvailable
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

		this.retryable = false;
	}
}

/**
 * 'Request timed out' Error message
 *
 * @class RequestTimeoutError
 * @extends {MoleculerRetryableError}
 */
class RequestTimeoutError extends MoleculerRetryableError {
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
		this.retryable = false;
	}
}

/**
 * 'Parameters of action call validation error
 *
 * @class ValidationError
 * @extends {MoleculerClientError}
 */
class ValidationError extends MoleculerClientError {
	/**
	 * Creates an instance of ValidationError.
	 *
	 * @param {String} message
	 * @param {String} type
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
 * @extends {MoleculerError}
 */
class MaxCallLevelError extends MoleculerError {
	/**
	 * Creates an instance of MaxCallLevelError.
	 *
	 * @param {any} data
	 *
	 * @memberOf MaxCallLevelError
	 */
	constructor(data) {
		super("Request level is reached the limit!", 500, null, data);
		this.retryable = false;
	}
}

/**
 * Custom Moleculer Error class
 *
 * @class ServiceSchemaError
 * @extends {Error}
 */
class ServiceSchemaError extends ExtendableError {
}

/**
 * Protocol version is mismatch
 *
 * @class ProtocolVersionMismatchError
 * @extends {Error}
 */
class ProtocolVersionMismatchError extends MoleculerError {
	/**
	 * Creates an instance of ProtocolVersionMismatchError.
	 *
	 * @param {String} action
	 *
	 * @memberOf ProtocolVersionMismatchError
	 */
	constructor(nodeID, actual, received) {
		super("Protocol version mismatch!", 500, null, { nodeID, actual, received });
	}
}


module.exports = {
	MoleculerError,
	MoleculerRetryableError,
	MoleculerServerError,
	MoleculerClientError,

	ServiceNotFoundError,
	ServiceNotAvailable,

	ValidationError,
	RequestTimeoutError,
	RequestSkippedError,
	MaxCallLevelError,

	ServiceSchemaError,

	ProtocolVersionMismatchError
};
