/*
 * ice-services
 * Copyright (c) 2016 Norbert Mereg (https://github.com/icebob/ice-services)
 * MIT Licensed
 */

"use strict";

let _ = require("lodash");
//let chalk = require("chalk");

let utils = require("./utils");

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
	constructor(opts) {
		opts = Object.assign({}, opts || {});
	
		this.opts = opts;
		this.id = utils.generateToken();
		this.requestID = opts.requestID || this.id;
		this.parent = opts.parent;
		this.broker = opts.broker;
		this.action = opts.action;
		if (this.broker) {
			this.logger = this.broker.getLogger("CTX");
		}

		this.level = opts.parent && opts.parent.level ? opts.parent.level + 1 : 1;
		this.params = Object.freeze(Object.assign({}, opts.params || {}));

		this.startTime = Date.now();
		this.stopTime = null;
		this.duration = 0;

		this._metricStart();
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
	createSubContext(action, params) {
		return new Context({
			parent: this,
			requestID: this.requestID,
			broker: this.broker,
			action: action || this.action,
			params
		});
	}

	/**
	 * Set params of context
	 * 
	 * @param {any} newParams
	 * 
	 * @memberOf Context
	 */
	setParams(newParams) {
		this.params = Object.freeze(Object.assign({}, newParams));
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
		return Promise.resolve(this)
			.then(ctx => handler(ctx))
			.then(res => {
				this.closeContext();
				return res;
			})
			.catch(err => {
				this.closeContext();
				if (!(err instanceof Error))
					err = new Error(err);
				
				err.ctx = this;
				return Promise.reject(err);				
			});
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
	 * Close this context
	 * 
	 * @memberOf Context
	 */
	closeContext() {
		this.stopTime = Date.now();
		this.duration = this.stopTime - this.startTime;
		if (this.parent) {
			this.parent.duration += this.duration;
		}
		this._metricFinish();
	}

	/**
	 * Call an other action. It will be create a sub-context.
	 * 
	 * @param {any} actionName
	 * @param {any} params
	 * @returns
	 * 
	 * @memberOf Context
	 */
	call(actionName, params) {
		return this.broker.call(actionName, params, this);
	}	

	_metricStart() {
		if (this.broker && this.broker.metricsEnabled()) {
			let payload = {
				id: this.id,
				requestID: this.requestID,
				time: this.startTime
			};
			if (this.parent) {
				payload.parent = this.parent.id;
			}
			if (this.action) {
				payload.action = {
					name: this.action.name
				};
			}
			this.broker.emit("metrics.context.start", payload);
		}
	}

	_metricFinish() {
		if (this.broker && this.broker.metricsEnabled()) {
			let payload = {
				id: this.id,
				requestID: this.requestID,
				time: this.stopTime,
				duration: this.duration
			};
			if (this.parent) {
				payload.parent = this.parent.id;
			}
			if (this.action) {
				payload.action = {
					name: this.action.name
				};
			}			
			this.broker.emit("metrics.context.finish", payload);
		}
	}
}

module.exports = Context;