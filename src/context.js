/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
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
	 * @memberof Context
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

	/**
	 * Add a context to be tracked as active
	 *
	 * @param {Context} context
	 *
	 * @private
	 * @memberof Service
	 */
	_trackContext(service) {
		if ( !service._activeContexts ) {
			service._activeContexts = [];
		}
		service._activeContexts.push(this);
		this.trackedBy = service;
	}

	/**
	 * Remove a context from the list of active context
	 *
	 * @param {Context} context
	 *
	 * @private
	 * @memberof Service
	 */
	dispose() {
		if ( this.trackedBy && this.trackedBy._activeContexts ) {
			const contextList = this.trackedBy._activeContexts;
			const contextIndex = contextList.indexOf(this);
			if (contextIndex !== -1) {
				contextList.splice(contextIndex, 1);
			}
		}
	}

	generateID() {
		this.id = generateToken();
	}

	/**
	 * Create a new Context instance.
	 *
	 * TODO: cover with unit tests
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
		const ctx = new broker.ContextFactory(broker, action);

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
			if (!ctx.requestID)
				ctx.requestID = ctx.id;
		}

		if (opts.trackContext) {
			ctx._trackContext(action.service || broker);
		}

		return ctx;
	}

	// TODO: cover with unit tests
	static createFromPayload(broker, payload) {
		const ctx = new broker.ContextFactory(broker, { name: payload.action, metrics: { params: false, meta: true } });
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
	 * @memberof Context
	 */
	setParams(newParams, cloning = false) {
		if (cloning && newParams)
			this.params = Object.assign({}, newParams);
		else
			this.params = newParams || {};
	}

	/**
	 * Merge metadata
	 *
	 * @param {Object} newMeta
	 *
	 * @private
	 * @memberof Context
	 */
	_mergeMeta(newMeta) {
		if (newMeta)
			_.assign(this.meta, newMeta);
		return this.meta;
	}

	/**
	 * Call an other action. It creates a sub-context.
	 *
	 * @param {String} actionName
	 * @param {Object?} params
	 * @param {Object?} opts
	 * @returns {Promise}
	 *
	 * @example <caption>Call an other service with params & options</caption>
	 * ctx.call("posts.get", { id: 12 }, { timeout: 1000 });
	 *
	 * @memberof Context
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

			if (!opts.timeout || distTimeout < opts.timeout)
				opts.timeout = distTimeout;
		}

		// Max calling level check to avoid calling loops
		if (this.broker.options.maxCallLevel > 0 && this.level >= this.broker.options.maxCallLevel) {
			return Promise.reject(new MaxCallLevelError(this.broker.nodeID, this.level));
		}

		let p = this.broker.call(actionName, params, opts);

		// Merge metadata with sub context metadata
		return p.then(res => {
			if (p.ctx)
				this._mergeMeta(p.ctx.meta);
			return res;
		}).catch(err => {
			if (p.ctx)
				this._mergeMeta(p.ctx.meta);
			return Promise.reject(err);
		});
	}

	/**
	 * Emit an event (grouped & balanced global event)
	 *
	 * @param {string} eventName
	 * @param {any} payload
	 * @param {String|Array<String>=} groups
	 * @returns
	 *
	 * @example
	 * ctx.emit("user.created", { entity: user, creator: ctx.meta.user });
	 *
	 * @memberof Context
	 */
	emit(eventName, data, groups) {
		return this.broker.emit(eventName, data, groups);
	}

	/**
	 * Emit an event for all local & remote services
	 *
	 * @param {string} eventName
	 * @param {any} payload
	 * @param {String|Array<String>=} groups
	 * @returns
	 *
	 * @example
	 * ctx.broadcast("user.created", { entity: user, creator: ctx.meta.user });
	 *
	 * @memberof Context
	 */
	broadcast(eventName, data, groups) {
		return this.broker.broadcast(eventName, data, groups);
	}

	/**
	 * Send start event to metrics system.
	 *
	 * @param {boolean} emitEvent
	 *
	 * @private
	 * @memberof Context
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

			// Process extra metrics
			this._processExtraMetrics(payload);

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
	 * @memberof Context
	 */
	_metricFinish(error, emitEvent) {
		if (this.startHrTime) {
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

			// Process extra metrics
			this._processExtraMetrics(payload);

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

	/**
	 * Assign extra metrics taking into account action definitions
	 *
	 * @param {string} name Field of the context to be assigned.
	 * @param {any} payload Object for assignement.
	 *
	 * @private
	 * @memberof Context
	 */
	_assignExtraMetrics(name, payload) {
		let def = this.action.metrics[name];
		// if metrics definitions is boolean do default, metrics=true
		if (def === true) {
			payload[name] = this[name];
		} else if (_.isArray(def)) {
			payload[name] = _.pick(this[name], def);
		} else if (_.isFunction(def)) {
			payload[name] = def(this[name]);
		}
	}

	/**
	 * Decide and process extra metrics taking into account action definitions
	 *
	 * @param {any} payload Object for assignement.
	 *
	 * @private
	 * @memberof Context
	 */
	_processExtraMetrics(payload) {
		// extra metrics (params and meta)
		if (_.isObject(this.action.metrics)) {
			// custom metrics def
			this._assignExtraMetrics("params", payload);
			this._assignExtraMetrics("meta", payload);
		}
	}
}

module.exports = Context;
