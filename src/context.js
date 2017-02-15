/*
 * servicer
 * Copyright (c) 2017 Icebob (https://github.com/icebob/servicer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const Promise = require("bluebird");

const utils = require("./utils");

const LOGGER_PREFIX = "CTX";

/**
 * Context class for action calls
 * 
 * @class Context
 */
class Context {

	/**
	 * Creates an instance of Context.
	 * 
	 * @param {any} opts
	 * 
	 * @memberOf Context
	 */
	constructor(opts = {}) {
		this.opts = opts;
		this.id = utils.generateToken();
		this.requestID = opts.requestID || this.id;
		this.broker = opts.broker;
		this.action = opts.action;
		if (this.broker) {
			this.logger = this.broker.getLogger(LOGGER_PREFIX);
			this.needMetrics = this.broker.metricsEnabled();
		}
		this.nodeID = opts.nodeID;
		this.user = opts.user;
		this.parent = opts.parent;
		this.subContexts = [];

		this.level = opts.parent && opts.parent.level ? opts.parent.level + 1 : 1;
		if (this.opts.cloneParams && opts.params)
			this.params = Object.assign({}, opts.params);
		else
			this.params = opts.params ||  {};

		this.startTime = null;
		this.stopTime = null;
		this.duration = 0;		

		this.error = null;
		this.cachedResult = false;
	}

	/**
	 * Create a sub-context from this context
	 * 
	 * @param {any} action
	 * @param {any} params
	 * @returns
	 * 
	 * @memberOf Context
	 */
	createSubContext(action, params, nodeID) {
		let ContextClass = this.broker ? this.broker.ContextFactory : Context;
		let ctx = new ContextClass({
			parent: this,
			requestID: this.requestID,
			broker: this.broker,
			action: action || this.action,
			nodeID,
			user: this.user,
			params
		});
		this.subContexts.push(ctx);

		return ctx;
	}

	/**
	 * Set params of context
	 * 
	 * @param {any} newParams
	 * 
	 * @memberOf Context
	 */
	setParams(newParams) {
		if (this.opts.cloneParams && newParams)
			this.params = Object.assign({}, newParams);
		else
			this.params = newParams;
	}

	/**
	 * Invoke an action handler. Wrap in a Promise & handle response & errors
	 * 
	 * @param {any} handler
	 * @returns
	 * 
	 * @memberOf Context
	 */
	invoke(handler) {
		let res;
		this._startInvoke();

		try {
			res = handler(this);
		} catch(err) {
			return this.invokeCatch(err);
		}

		if (utils.isPromise(res)) {
			return res.then(data => {
				this._finishInvoke();
				return data;
			}).catch(err => this.invokeCatch(err));
		} else {
			this._finishInvoke();
			return Promise.resolve(res);
		}
	}

	invokeCatch(err) {
		if (!(err instanceof Error)) {
			err = new Error(err);
		}

		this.logger.error("", err);

		this.error = err;
		err.ctx = this;

		this._finishInvoke();

		return Promise.reject(err);				
	}

	
	/**
	 * Call a function after the `res`. If `res` is a promise, use `.then`. Otherwise call the `fn` synchroniously.
	 * 
	 * @param {any} res	- Result object or a Promise
	 * @param {any} fn	- Function what we will be call
	 * @returns
	 * 
	 * @memberOf Context
	 */
	after(res, fn) {
		if (utils.isPromise(res)) {
			return res.then(res => fn(res));
		} else {
			return fn(res);
		}
	}	

	/**
	 * Start invoke
	 * 
	 * @memberOf Context
	 */
	_startInvoke() {
		this.startTime = Date.now();
		this.stopTime = null;
		this.duration = 0;

		this._metricStart();
	}

	/**
	 * Finish invoke
	 * 
	 * @memberOf Context
	 */
	_finishInvoke() {
		this.stopTime = Date.now();
		this.duration = this.stopTime - this.startTime;

		this._metricFinish();
	}

	/**
	 * Call an other action. It will be create a sub-context.
	 * 
	 * @param {any} actionName
	 * @param {any} params
	 * @param {any} opts
	 * @returns
	 * 
	 * @memberOf Context
	 */
	call(actionName, params, opts = {}) {
		opts.parentCtx = this;
		return this.broker.call(actionName, params, opts);
	}	

	/**
	 * Call a global event (with broker.emit)
	 * 
	 * @param {any} eventName
	 * @param {any} data
	 * @returns
	 * 
	 * @memberOf Context
	 */
	emit(eventName, data) {
		return this.broker.emit(eventName, data);
	}

	/**
	 * Send start event to metrics system
	 * 
	 * @memberOf Context
	 */
	_metricStart() {
		if (this.needMetrics) {
			let payload = {
				id: this.id,
				requestID: this.requestID,
				startTime: this.startTime,
				level: this.level,
				remoteCall: this.remoteCall
			};
			if (this.action) {
				payload.action = {
					name: this.action.name
				};
			}
			if (this.parent) {
				payload.parent = this.parent.id;
			}
			this.broker.emit("metrics.context.start", payload);
		}
	}

	/**
 	 * Send finish event to metrics system
	 * 
	 * @memberOf Context
	 */
	_metricFinish() {
		if (this.needMetrics) {
			let payload = {
				id: this.id,
				requestID: this.requestID,
				level: this.level,
				endTime: this.stopTime,
				duration: this.duration,
				remoteCall: this.remoteCall,
				fromCache: this.cachedResult
			};
			if (this.action) {
				payload.action = {
					name: this.action.name
				};
			}			
			if (this.parent) {
				payload.parent = this.parent.id;
			}
			if (this.error) {
				payload.error = {
					type: this.error.name,
					message: this.error.message
				};
			}
			this.broker.emit("metrics.context.finish", payload);
		}
	}
}

module.exports = Context;