/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

//const Promise = require("bluebird");
const _ = require("lodash");
const utils = require("./utils");

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
	/*constructor(opts = {}) {
		this.opts = opts;
		this.broker = opts.broker;
		this.action = opts.action;
		this.nodeID = opts.nodeID;
		this.parentID = opts.parent ? opts.parent.id : null;

		this.metrics = !!opts.metrics;
		this.level = opts.level || (opts.parent && opts.parent.level ? opts.parent.level + 1 : 1);

		this.setParams(opts.params);

		this.timeout = opts.timeout || 0;
		this.retryCount = opts.retryCount || 0;

		if (opts.parent && opts.parent.meta) {
			// Merge metadata
			this.meta = _.assign({}, opts.parent.meta, opts.meta);
		} else {
			this.meta = opts.meta || {};
		}

		// Generate ID for context
		if (this.nodeID || opts.metrics)
			this.id = opts.id || utils.generateToken();

		// Initialize metrics properties
		if (this.metrics) {
			this.requestID = opts.requestID || (opts.parent && opts.parent.requestID ? opts.parent.requestID : undefined);

			this.startTime = null;
			this.startHrTime = null;
			this.stopTime = null;
			this.duration = 0;
		}		

		//this.error = null;
		this.cachedResult = false;
	}
	*/

	constructor() {
		this.id = null;
		this.broker = null;
		this.action = null;
		this.nodeID = null;
		this.parentID = null;

		this.metrics = false;
		this.level = 1;

		this.timeout = 0;
		this.retryCount = 0;

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
		this.id = utils.generateToken();
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
			this.params = newParams || {};
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
		this.startTime = Date.now();
		this.startHrTime = process.hrtime();
		
		let payload = {
			id: this.id,
			requestID: this.requestID,
			startTime: this.startTime,
			level: this.level,
			remoteCall: !!this.nodeID
		};
		if (this.action) {
			payload.action = {
				name: this.action.name
			};
		}
		if (this.parentID)
			payload.parent = this.parentID;
		
		this.broker.emit("metrics.trace.span.start", payload);

		this.duration = 0;
	}

	/**
 	 * Send finish event to metrics system
	 * 
	 * @memberOf Context
	 */
	_metricFinish(error) {
		let diff = process.hrtime(this.startHrTime);
		this.duration = (diff[0] * 1e3) + (diff[1] / 1e6); // milliseconds
		this.stopTime = this.startTime + this.duration;

		let payload = {
			id: this.id,
			requestID: this.requestID,
			level: this.level,
			endTime: this.stopTime,
			duration: this.duration,
			remoteCall: !!this.nodeID,
			fromCache: this.cachedResult
		};
		if (this.action) {
			payload.action = {
				name: this.action.name
			};
		}			
		if (this.parentID) 
			payload.parent = this.parentID;
		
		if (error) {
			payload.error = {
				type: error.name,
				message: error.message
			};
		}
		this.broker.emit("metrics.trace.span.finish", payload);
	}
}

module.exports = Context;