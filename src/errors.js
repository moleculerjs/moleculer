/*
 * moleculer
 * Copyright (c) 2023 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

/**
 * Extendable errors class.
 *
 * Credits: https://github.com/bjyoungblood/es6-error/blob/master/src/index.js
 */
class ExtendableError extends Error {
	constructor(message = "") {
		super(message);

		// extending Error is weird and does not propagate `message`
		Object.defineProperty(this, "message", {
			configurable: true,
			enumerable: false,
			value: message,
			writable: true
		});

		Object.defineProperty(this, "name", {
			configurable: true,
			enumerable: false,
			value: this.constructor.name,
			writable: true
		});

		if (Object.prototype.hasOwnProperty.call(Error, "captureStackTrace")) {
			Error.captureStackTrace(this, this.constructor);
			return;
		}

		Object.defineProperty(this, "stack", {
			configurable: true,
			enumerable: false,
			value: new Error(message).stack,
			writable: true
		});
	}
}

class TimeoutError extends ExtendableError {}

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
	 * @param {any?} data
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
 * Moleculer Error class for Broker disconnections which are retryable.
 *
 * @class MoleculerServerError
 * @extends {MoleculerRetryableError}
 */
class BrokerDisconnectedError extends MoleculerRetryableError {
	constructor() {
		super(
			"The broker's transporter has disconnected. Please try again when a connection is reestablished.",
			502,
			"BAD_GATEWAY"
		);
		// Stack trace is hidden because it creates a lot of logs and, in this case, won't help users find the issue
		this.stack = "";
	}
}

/**
 * Moleculer Error class for server errors which are retryable.
 *
 * @class MoleculerServerError
 * @extends {MoleculerRetryableError}
 */
class MoleculerServerError extends MoleculerRetryableError {}

/**
 * Moleculer Error class for client errors which are not retryable.
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
		if (data.nodeID && data.action)
			msg = `Service '${data.action}' is not found on '${data.nodeID}' node.`;
		else if (data.action) msg = `Service '${data.action}' is not found.`;

		if (data.service && data.version)
			msg = `Service '${data.version}.${data.service}' not found.`;
		else if (data.service) msg = `Service '${data.service}' not found.`;

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
		else msg = `Service '${data.action}' is not available.`;

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
	 * @param {Object} data
	 *
	 * @memberof RequestTimeoutError
	 */
	constructor(data) {
		super(
			`Request is timed out when call '${data.action}' action on '${data.nodeID}' node.`,
			504,
			"REQUEST_TIMEOUT",
			data
		);
	}
}

/**
 * 'Request skipped for timeout' Error message
 *
 * @class RequestSkippedError
 * @extends {MoleculerError}
 */
class RequestSkippedError extends MoleculerError {
	/**
	 * Creates an instance of RequestSkippedError.
	 *
	 * @param {Object} data
	 *
	 * @memberof RequestSkippedError
	 */
	constructor(data) {
		super(
			`Calling '${data.action}' is skipped because timeout reached on '${data.nodeID}' node.`,
			514,
			"REQUEST_SKIPPED",
			data
		);
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
	 * @param {Object} data
	 *
	 * @memberof RequestRejectedError
	 */
	constructor(data) {
		super(
			`Request is rejected when call '${data.action}' action on '${data.nodeID}' node.`,
			503,
			"REQUEST_REJECTED",
			data
		);
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
	 * @param {Object} data
	 *
	 * @memberof QueueIsFullError
	 */
	constructor(data) {
		super(
			`Queue is full. Request '${data.action}' action on '${data.nodeID}' node is rejected.`,
			429,
			"QUEUE_FULL",
			data
		);
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
		super(message, 422, type || "VALIDATION_ERROR", data);
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
	 * @param {Object} data
	 *
	 * @memberof MaxCallLevelError
	 */
	constructor(data) {
		super(
			`Request level is reached the limit (${data.level}) on '${data.nodeID}' node.`,
			500,
			"MAX_CALL_LEVEL",
			data
		);
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
	 * @param {Object} data
	 * @memberof ServiceSchemaError
	 */
	constructor(msg, data) {
		super(msg, 500, "SERVICE_SCHEMA_ERROR", data);
	}
}

/**
 * Custom Moleculer Error class for broker option errors
 *
 * @class BrokerOptionsError
 * @extends {Error}
 */
class BrokerOptionsError extends MoleculerError {
	/**
	 * Creates an instance of BrokerOptionsError.
	 *
	 * @param {String} msg
	 * @param {Object} data
	 * @memberof BrokerOptionsError
	 */
	constructor(msg, data) {
		super(msg, 500, "BROKER_OPTIONS_ERROR", data);
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
	 * @param {Object?} data
	 * @memberof GracefulStopTimeoutError
	 */
	constructor(data) {
		if (data && data.service) {
			super(
				`Unable to stop '${data.service.name}' service gracefully.`,
				500,
				"GRACEFUL_STOP_TIMEOUT",
				data && data.service
					? {
							name: data.service.name,
							version: data.service.version
					  }
					: null
			);
		} else {
			super("Unable to stop ServiceBroker gracefully.", 500, "GRACEFUL_STOP_TIMEOUT");
		}
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
	 * @param {Object} data
	 *
	 * @memberof ProtocolVersionMismatchError
	 */
	constructor(data) {
		super("Protocol version mismatch.", 500, "PROTOCOL_VERSION_MISMATCH", data);
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
	 * @param {Object} data
	 *
	 * @memberof InvalidPacketDataError
	 */
	constructor(data) {
		super("Invalid packet data.", 500, "INVALID_PACKET_DATA", data);
	}
}

/**
 * Recreate an error from a transferred payload `err`
 *
 * @param {Error} err
 * @returns {MoleculerError}
 */
function recreateError(err) {
	const Class = module.exports[err.name];
	if (Class) {
		switch (err.name) {
			case "MoleculerError":
				return new Class(err.message, err.code, err.type, err.data);
			case "MoleculerRetryableError":
				return new Class(err.message, err.code, err.type, err.data);
			case "MoleculerServerError":
				return new Class(err.message, err.code, err.type, err.data);
			case "MoleculerClientError":
				return new Class(err.message, err.code, err.type, err.data);

			case "ValidationError":
				return new Class(err.message, err.type, err.data);

			case "ServiceNotFoundError":
				return new Class(err.data);
			case "ServiceNotAvailableError":
				return new Class(err.data);
			case "RequestTimeoutError":
				return new Class(err.data);
			case "RequestSkippedError":
				return new Class(err.data);
			case "RequestRejectedError":
				return new Class(err.data);
			case "QueueIsFullError":
				return new Class(err.data);
			case "MaxCallLevelError":
				return new Class(err.data);
			case "GracefulStopTimeoutError":
				return new Class(err.data);
			case "ProtocolVersionMismatchError":
				return new Class(err.data);
			case "InvalidPacketDataError":
				return new Class(err.data);

			case "ServiceSchemaError":
			case "BrokerOptionsError":
				return new Class(err.message, err.data);
		}
	}
}

/**
 * Error Regenerator
 * @class Regenerator
 */
class Regenerator {
	/**
	 * Initializes Regenerator
	 *
	 * @param {ServiceBroker} broker
	 *
	 * @memberof Regenerator
	 */
	init(broker) {
		this.broker = broker;
	}

	/**
	 * Restores an Error object
	 *
	 * @param {Object} plainError
	 * @param {Object} payload
	 * @return {Error}
	 *
	 * @memberof Regenerator
	 */
	restore(plainError, payload) {
		let err = this.restoreCustomError(plainError, payload);
		if (!err) {
			err = recreateError(plainError);
		}
		if (!err) {
			err = this._createDefaultError(plainError);
		}
		this._restoreExternalFields(plainError, err, payload);
		this._restoreStack(plainError, err);

		return err;
	}

	/**
	 * Extracts a plain error object from Error object
	 *
	 * @param {Error} err
	 * @param {Object} payload
	 * @return {Object} plain error
	 *
	 * @memberof Regenerator
	 */
	extractPlainError(err) {
		return {
			name: err.name,
			message: err.message,
			nodeID: err.nodeID || this.broker.nodeID,
			code: err.code,
			type: err.type,
			retryable: err.retryable,
			stack: err.stack,
			data: err.data
		};
	}

	/**
	 * Hook to restore a custom error in a child class
	 *
	 * @param {Object} plainError
	 * @param {Object} payload
	 * @return {Error | undefined}
	 *
	 * @memberof Regenerator
	 */
	restoreCustomError() {
		return undefined;
	}

	/**
	 * Creates a default error if not found
	 *
	 * @param {Object} plainError
	 * @return {Error}
	 * @private
	 *
	 * @memberof Regenerator
	 */
	_createDefaultError(plainError) {
		const err = new Error(plainError.message);
		err.name = plainError.name;
		err.code = plainError.code;
		err.type = plainError.type;
		err.data = plainError.data;

		return err;
	}

	/**
	 * Restores external error fields
	 *
	 * @param {Object} plainError
	 * @param {Object} err
	 * @param {Object} payload
	 * @private
	 *
	 * @memberof Regenerator
	 */
	_restoreExternalFields(plainError, err, payload) {
		err.retryable = plainError.retryable;
		err.nodeID = plainError.nodeID || payload.sender;
	}

	/**
	 * Restores an error stack
	 *
	 * @param {Object} plainError
	 * @param {Object} err
	 * @private
	 *
	 * @memberof Regenerator
	 */
	_restoreStack(plainError, err) {
		if (plainError.stack) err.stack = plainError.stack;
	}
}

/**
 * Resolves a regenerator option
 *
 * @param {Regenerator} opt
 * @return {Regenerator}
 */
function resolveRegenerator(opt) {
	if (opt instanceof Regenerator) {
		return opt;
	}

	return new Regenerator();
}

module.exports = {
	ExtendableError,
	TimeoutError,

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
	BrokerOptionsError,
	GracefulStopTimeoutError,

	ProtocolVersionMismatchError,
	InvalidPacketDataError,

	BrokerDisconnectedError,

	recreateError,
	resolveRegenerator,
	Regenerator
};
