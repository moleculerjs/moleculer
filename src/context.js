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
 * Merge metadata
 *
 * @param {Object} newMeta
 *
 * @private
 * @memberof Context
 */
function mergeMeta(ctx, newMeta) {
	if (newMeta)
		_.assign(ctx.meta, newMeta);
	return ctx.meta;
}

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
	 * @param {Endpoint} endpoint - Endpoint (action & nodeID)
	 *
	 * @memberof Context
	 */
	constructor(broker, endpoint) {
		this._id = null;

		this.broker = broker;
		this.endpoint = endpoint;
		this.action = endpoint ? endpoint.action : null;
		this.service = this.action ? this.action.service : null;
		if (endpoint && endpoint.node)
			this.nodeID = endpoint.node.id;
		else if (this.broker)
			this.nodeID = this.broker.nodeID;
		else
			this.nodeID = null;

		this.options = {
			timeout: null,
			retries: null,
		};

		this.parentID = null;
		this.callerNodeID = null;

		this.metrics = null;
		this.level = 1;

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
	 * Create a new Context instance.
	 *
	 * TODO: cover with unit tests
	 *
	 * @param {ServiceBroker} broker
	 * @param {Endpoint} endpoint
	 * @param {Object?} params
	 * @param {Object} opts
	 * @returns {Context}
	 *
	 * @static
	 * @memberof Context
	 */
	static create(broker, endpoint, params, opts = {}) {
		const ctx = new broker.ContextFactory(broker, endpoint);

		ctx.setParams(params);

		//Object.assign(ctx.options, opts);
		ctx.options = opts;

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

		// ParentID, Level
		if (opts.parentCtx != null) {
			ctx.parentID = opts.parentCtx.id;
			ctx.level = opts.parentCtx.level + 1;
		}

		// Metrics
		if (opts.parentCtx != null)
			ctx.metrics = opts.parentCtx.metrics;

		return ctx;
	}

	/**
	 * Context ID getter
	 *
	 * @readonly
	 * @memberof Context
	 */
	get id() {
		if (!this._id) {
			this._id = generateToken();
			if (!this.requestID)
				this.requestID = this._id;
		}
		return this._id;
	}

	/**
	 * Context ID setter
	 *
	 * @memberof Context
	 */
	set id(val) {
		this._id = val;
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
		if (this.options.timeout > 0 && this.startHrTime) {
			// Distributed timeout handling. Decrementing the timeout value with the elapsed time.
			// If the timeout below 0, skip the call.
			const diff = process.hrtime(this.startHrTime);
			const duration = (diff[0] * 1e3) + (diff[1] / 1e6);
			const distTimeout = this.options.timeout - duration;

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
				mergeMeta(this, p.ctx.meta);

			return res;
		}).catch(err => {
			if (p.ctx)
				mergeMeta(this, p.ctx.meta);

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

}

module.exports = Context;
