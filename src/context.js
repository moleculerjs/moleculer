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
	 * Close this context successfully with response data
	 * 
	 * @param {any} data
	 * @returns
	 * 
	 * @memberOf Context
	 */
	result(data) {
		return Promise.resolve(data)
			.then((res) => {
				this.closeContext();
				//this.logger.debug(chalk.green(`Context for '${this.action.name}': [${this.duration}ms] result:`), this.params);

				return res;
			});
	}

	/**
	 * Close this context with error
	 * 
	 * @param {any} err
	 * @returns
	 * 
	 * @memberOf Context
	 */
	error(err) {
		this.closeContext();
		//this.logger.error(chalk.red.bold(`[${this.duration}ms] error:`), err);
		return Promise.reject(err);
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
		if (this.broker) {
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
		if (this.broker) {
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