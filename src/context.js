/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

//const Promise = require("bluebird");
const _ = require("lodash");
const { generateToken } = require("./utils");
const { RequestSkippedError, MaxCallLevelError } = require("./errors");

/**
 * Context class for action calls
 *
 * @property {String} id - Context ID
 * @property {ServiceBroker} broker - Broker instance
 * @property {Action} action - Action definition
 * @property {String} [nodeID=null] - Node ID
 * @property {String} parentID - Parent Context ID
 * @property {Boolean} metrics - Need send metrics events
 * @property {Number} [level=1] - Level of context
 *
 * @class Context
 */
class Context {

	/**
	 * Creates an instance of Context.
	 *
	 * @param {ServiceBroker} broker - Broker instance
	 * @param {Action} action - Action definition
	 *
	 * @example
	 * let ctx = new Context(broker, action);
	 *
	 * @example
	 * let ctx2 = new Context(broker, action);
	 *
	 * @memberOf Context
	 */
	constructor(broker, action) {
		this.id = null;

		this.broker = broker;
		this.action = action;
		this.nodeID = broker ? broker.nodeID : null;
		this.parentID = null;
		this.callerNodeID = null;

		this.metrics = false;
		this.level = 1;

		this.timeout = 0;
		this.retryCount = 0;

		this.params = {};
		this.meta = {};

		this.requestID = null;
		this.startTime = null;
		this.startHrTime = null;
		this.stopTime = null;
		this.duration = 0;

		//this.error = null;
		this.cachedResult = false;
	}

	generateID() {
		this.id = generateToken();
	}

	/**
	 * Create a new Context instance.
	 *
	 * @param {ServiceBroker} broker
	 * @param {Object} action
	 * @param {String?} nodeID
	 * @param {Object?} params
	 * @param {Object} opts
	 * @returns {Context}
	 *
	 * @static
	 * @memberof Context
	 */
	static create(broker, action, nodeID, params, opts) {
		const ctx = new Context(broker, action);

		ctx.nodeID = nodeID;
		ctx.setParams(params);

		// RequestID
		if (opts.requestID != null)
			ctx.requestID = opts.requestID;
		else if (opts.parentCtx != null && opts.parentCtx.requestID != null)
			ctx.requestID = opts.parentCtx.requestID;

		// Meta
		if (opts.parentCtx != null && opts.parentCtx.meta != null)
			ctx.meta = _.assign({}, opts.parentCtx.meta, opts.meta);
		else if (opts.meta != null)
			ctx.meta = opts.meta;

		// Timeout
		ctx.timeout = opts.timeout;
		ctx.retryCount = opts.retryCount;

		if (opts.parentCtx != null) {
			ctx.parentID = opts.parentCtx.id;
			ctx.level = opts.parentCtx.level + 1;
		}

		// Metrics
		if (opts.parentCtx != null)
			ctx.metrics = opts.parentCtx.metrics;
		else
			ctx.metrics = broker.shouldMetric();

		// ID, parentID, level
		if (ctx.metrics || nodeID != broker.nodeID) {
			ctx.generateID();
		}

		return ctx;
	}

	static createFromPayload(broker, payload) {
		const ctx = new Context(broker, { name: payload.action });
		ctx.id = payload.id;
		ctx.setParams(payload.params);
		ctx.parentID = payload.parentID;
		ctx.requestID = payload.requestID;
		ctx.meta = payload.meta || {};

		ctx.timeout = payload.timeout || 0;
		ctx.level = payload.level;
		ctx.metrics = payload.metrics;
		ctx.callerNodeID = payload.sender;

		return ctx;
	}

	/**
	 * Set params of context
	 *
	 * @param {Object} newParams
	 * @param {Boolean} cloning
	 *
	 * @memberOf Context
	 */
	setParams(newParams, cloning = false) {
		if (cloning && newParams)
			this.params = Object.assign({}, newParams);
		else
			this.params = newParams || {};
	}

	/**
	 * Call an other action. It will be create a sub-context.
	 *
	 * @param {String} actionName
	 * @param {Object?} params
	 * @param {Object?} opts
	 * @returns {Promise}
	 *
	 * @example <caption>Call an other service with params & options</caption>
	 * ctx.call("posts.get", { id: 12 }, { timeout: 1000 });
	 *
	 * @memberOf Context
	 */
	call(actionName, params, opts = {}) {
		opts.parentCtx = this;
		if (this.timeout > 0 && this.startHrTime) {
			// Distributed timeout handling. Decrementing the timeout value with the elapsed time.
			// If the timeout below 0, skip the call.
			const diff = process.hrtime(this.startHrTime);
			const duration = (diff[0] * 1e3) + (diff[1] / 1e6);
			const distTimeout = this.timeout - duration;

			if (distTimeout <= 0) {
				return Promise.reject(new RequestSkippedError(actionName, this.broker.nodeID));
			}
			opts.timeout = distTimeout;

		}

		// Max calling level check to avoid calling loops
		if (this.broker.options.maxCallLevel > 0 && this.level >= this.broker.options.maxCallLevel) {
			return Promise.reject(new MaxCallLevelError({ level: this.level, action: actionName }));
		}

		return this.broker.call(actionName, params, opts);
	}

	/**
	 * Call a global event (with broker.emit).
	 *
	 * @param {String} eventName
	 * @param {any} data
	 * @returns
	 *
	 * @example
	 * ctx.emit("user.created", { entity: user, creator: ctx.meta.user });
	 *
	 * @memberOf Context
	 */
	emit(eventName, data) {
		return this.broker.emit(eventName, data);
	}

	/**
	 * Send start event to metrics system.
	 *
	 * @param {boolean} emitEvent
	 *
	 * @private
	 * @memberOf Context
	 */
	_metricStart(emitEvent) {
		this.startTime = Date.now();
		this.startHrTime = process.hrtime();
		this.duration = 0;

		if (emitEvent) {
			let payload = {
				id: this.id,
				requestID: this.requestID,
				level: this.level,
				startTime: this.startTime,
				remoteCall: !!this.callerNodeID
			};
			if (this.action) {
				payload.action = {
					name: this.action.name
				};
			}
			if (this.parentID)
				payload.parent = this.parentID;

			payload.nodeID = this.nodeID;
			if (this.callerNodeID)
				payload.callerNodeID = this.callerNodeID;

			this.broker.emit("metrics.trace.span.start", payload);
		}
	}

	/**
	 * Send finish event to metrics system.
	 *
	 * @param {Error} error
	 * @param {boolean} emitEvent
	 *
	 * @private
	 * @memberOf Context
	 */
	_metricFinish(error, emitEvent) {
		if (this.startHrTime){
			let diff = process.hrtime(this.startHrTime);
			this.duration = (diff[0] * 1e3) + (diff[1] / 1e6); // milliseconds
		}
		this.stopTime = this.startTime + this.duration;

		if (emitEvent) {
			let payload = {
				id: this.id,
				requestID: this.requestID,
				level: this.level,
				startTime: this.startTime,
				endTime: this.stopTime,
				duration: this.duration,
				remoteCall: !!this.callerNodeID,
				fromCache: this.cachedResult
			};
			if (this.action) {
				payload.action = {
					name: this.action.name
				};
			}
			if (this.parentID)
				payload.parent = this.parentID;

			payload.nodeID = this.nodeID;
			if (this.callerNodeID)
				payload.callerNodeID = this.callerNodeID;

			if (error) {
				payload.error = {
					name: error.name,
					code: error.code,
					type: error.type,
					message: error.message
				};
			}
			this.broker.emit("metrics.trace.span.finish", payload);
		}
	}
}

module.exports = Context;
