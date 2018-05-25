/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const ExtendableError = require("es6-error");

/*
	TODO:
		- consolidate error arguments
				If not Moleculer*Error, args is data always
		- add recreate from payload method
*/

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
 * Custom Moleculer Error class for retryable errors.
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
	 * @memberof MoleculerRetryableError
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
 * Moleculer Error class for server error which is retryable.
 *
 * @class MoleculerServerError
 * @extends {MoleculerRetryableError}
 */
class MoleculerServerError extends MoleculerRetryableError {
}

/**
 * Moleculer Error class for client errors which is not retryable.
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
	 * @memberof MoleculerClientError
	 */
	constructor(message, code, type, data) {
		super(message, code || 400, type, data);
	}
}


/**
 * 'Service not found' Error message
 *
 * @class ServiceNotFoundError
 * @extends {MoleculerRetryableError}
 */
class ServiceNotFoundError extends MoleculerRetryableError {
	/**
	 * Creates an instance of ServiceNotFoundError.
	 *
	 * @param {Object} data
	 *
	 * @memberof ServiceNotFoundError
	 */
	constructor(data = {}) {
		let msg;
		if (data.nodeID)
			msg = `Service '${data.action}' is not found on '${data.nodeID}' node.`;
		else
			msg = `Service '${data.action}' is not found.`;

		super(msg, 404, "SERVICE_NOT_FOUND", data);
	}
}

/**
 * 'Service not available' Error message
 *
 * @class ServiceNotAvailableError
 * @extends {MoleculerRetryableError}
 */
class ServiceNotAvailableError extends MoleculerRetryableError {
	/**
	 * Creates an instance of ServiceNotAvailableError.
	 *
	 * @param {Object} data
	 *
	 * @memberof ServiceNotAvailableError
	 */
	constructor(data) {
		let msg;
		if (data.nodeID)
			msg = `Service '${data.action}' is not available on '${data.nodeID}' node.`;
		else
			msg = `Service '${data.action}' is not available.`;

		super(msg, 404, "SERVICE_NOT_AVAILABLE", data);
	}
}

/**
 * 'Request timed out' Error message. Retryable.
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
	 * @memberof RequestTimeoutError
	 */
	constructor(action, nodeID) {
		super(`Request is timed out when call '${action}' action on '${nodeID}' node.`, 504, null, {
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
	 * @memberof RequestSkippedError
	 */
	constructor(action, nodeID) {
		super(`Calling '${action}' is skipped because timeout reached on '${nodeID}' node.`, 514, null, {
			action,
			nodeID
		});
		this.retryable = false;
	}
}

/**
 * 'Request rejected' Error message. Retryable.
 *
 * @class RequestRejectedError
 * @extends {MoleculerRetryableError}
 */
class RequestRejectedError extends MoleculerRetryableError {
	/**
	 * Creates an instance of RequestRejectedError.
	 *
	 * @param {String} action
	 * @param {String} nodeID
	 *
	 * @memberof RequestRejectedError
	 */
	constructor(action, nodeID) {
		super(`Request is rejected when call '${action}' action on '${nodeID}' node.`, 503, null, {
			action,
			nodeID
		});
	}
}

/**
 * 'Queue is full' error message. Retryable.
 *
 * @class QueueIsFullError
 * @extends {MoleculerRetryableError}
 */
class QueueIsFullError extends MoleculerRetryableError {
	/**
	 * Creates an instance of QueueIsFullError.
	 *
	 * @param {String} action
	 * @param {String} nodeID
	 * @param {Number} size
	 * @param {Number} limit
	 *
	 * @memberof QueueIsFullError
	 */
	constructor(action, nodeID, size, limit) {
		super(`Queue is full. Request '${action}' action on '${nodeID}' node is rejected.`, 429, null, {
			action,
			nodeID,
			size,
			limit
		});
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
	 * @memberof ValidationError
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
	 * @param {String} nodeID
	 * @param {Number} level
	 *
	 * @memberof MaxCallLevelError
	 */
	constructor(nodeID, level) {
		super(`Request level is reached the limit (${level}) on '${nodeID}' node.`, 500, null, { level });
		this.retryable = false;
	}
}

/**
 * Custom Moleculer Error class for Service schema errors
 *
 * @class ServiceSchemaError
 * @extends {Error}
 */
class ServiceSchemaError extends MoleculerError {
	/**
	 * Creates an instance of ServiceSchemaError.
	 *
	 * @param {String} msg
	 * @memberof ServiceSchemaError
	 */
	constructor(msg) {
		super(msg, 500, null);
	}
}

/**
 * Custom Moleculer Error class for Graceful stopping
 *
 * @class GracefulStopTimeoutError
 * @extends {Error}
 */
class GracefulStopTimeoutError extends MoleculerError {
	/**
	 * Creates an instance of GracefulStopTimeoutError.
	 *
	 * @param {Service} service
	 * @memberof GracefulStopTimeoutError
	 */
	constructor(service) {
		super(`Unable to stop '${service.name}' service gracefully.`, 500, null, {
			name: service.name,
			version: service.version
		});
	}
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
	 * @memberof ProtocolVersionMismatchError
	 */
	constructor(nodeID, actual, received) {
		super("Protocol version mismatch.", 500, null, { nodeID, actual, received });
	}
}

/**
 * Invalid packet format error
 *
 * @class InvalidPacketDataError
 * @extends {Error}
 */
class InvalidPacketDataError extends MoleculerError {
	/**
	 * Creates an instance of InvalidPacketDataError.
	 *
	 * @param {String} type
	 * @param {Object} payload
	 *
	 * @memberof InvalidPacketDataError
	 */
	constructor(type, payload) {
		super("Invalid packet data.", 500, null, { type, payload });
	}
}


module.exports = {
	MoleculerError,
	MoleculerRetryableError,
	MoleculerServerError,
	MoleculerClientError,

	ServiceNotFoundError,
	ServiceNotAvailableError,

	ValidationError,
	RequestTimeoutError,
	RequestSkippedError,
	RequestRejectedError,
	QueueIsFullError,
	MaxCallLevelError,

	ServiceSchemaError,
	GracefulStopTimeoutError,

	ProtocolVersionMismatchError,
	InvalidPacketDataError
};
