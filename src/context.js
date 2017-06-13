/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

//const Promise = require("bluebird");
const utils = require("./utils");
const { RequestSkippedError } = require("./errors");

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
	constructor(broker, action) {
		this.id = null;
		this.broker = broker;
		this.action = action;
		this.nodeID = null;
		this.parentID = null;

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
		this.id = utils.generateToken();
	}

	/**
	 * Set params of context
	 * 
	 * @param {any} newParams
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
	 * @param {any} actionName
	 * @param {any} params
	 * @param {any} opts
	 * @returns
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
	 * @param {boolean} emitEvent
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
				remoteCall: !!this.nodeID
			};
			if (this.action) {
				payload.action = {
					name: this.action.name
				};
			}
			if (this.parentID)
				payload.parent = this.parentID;

			payload.nodeID = this.broker.nodeID;
			if (this.nodeID)
				payload.targetNodeID = this.nodeID;
			
			this.broker.emit("metrics.trace.span.start", payload);
		}
	}

	/**
 	 * Send finish event to metrics system
	 * @param {Error} error
	 * @param {boolean} emitEvent
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
			
			payload.nodeID = this.broker.nodeID;
			if (this.nodeID)
				payload.targetNodeID = this.nodeID;
			
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