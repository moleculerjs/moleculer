/*
 * ice-services
 * Copyright (c) 2017 Norbert Mereg (https://github.com/icebob/ice-services)
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
		this.parent = opts.parent;
		this.subContexts = [];

		this.level = opts.parent && opts.parent.level ? opts.parent.level + 1 : 1;
		this.params = opts.params ? Object.assign({}, opts.params) : {};

		this.startTime = null;
		this.stopTime = null;
		this.duration = 0;		

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
		let ctx = new Context({
			parent: this,
			requestID: this.requestID,
			broker: this.broker,
			action: action || this.action,
			nodeID,
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
		this.params = _.cloneDeep(newParams);
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
		this._finishInvoke();
		if (!(err instanceof Error)) {
			err = new Error(err);
		}
		
		err.ctx = this;
		return Promise.reject(err);				
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

		if (!this.parent)
			this.printMeasuredTimes();
		
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
		if (this.needMetrics) {
			let payload = {
				id: this.id,
				requestID: this.requestID,
				time: this.startTime
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

	_metricFinish() {
		if (this.needMetrics) {
			let payload = {
				id: this.id,
				requestID: this.requestID,
				time: this.stopTime,
				duration: this.duration
			};
			if (this.action) {
				payload.action = {
					name: this.action.name
				};
			}			
			if (this.parent) {
				payload.parent = this.parent.id;
			}
			this.broker.emit("metrics.context.finish", payload);
		}
	}

	/*
		┌─────────────────────────────────────────────────────────────────────────┐
		│ request.rest                      27ms [■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■] │
		│   session.me                    » 25ms [.■■■■■■■■■■■■■■■■■■■■■■■■■■■■.] │
		│     profile.get                 * 24ms [..■■■■■■■■■■■■■■■■■■■■■■■■■■■.] │
		└─────────────────────────────────────────────────────────────────────────┘
	*/
	/* istanbul ignore next */
	printMeasuredTimes() {
		if (!this.logger) return;

		let w = 73;
		let r = _.repeat;
		let gw = 35;
		let maxTitle = w - 2 - 2 - gw - 2 - 1;

		this.logger.debug(["┌", r("─", w-2), "┐"].join(""));

		let printCtxTime = (ctx) => {
			let maxActionName = maxTitle - (ctx.level-1) * 2 - ctx.duration.toString().length - 3 - (ctx.cachedResult ? 2 : 0) - (ctx.remoteCall ? 2 : 0);
			let actionName = ctx.action ? ctx.action.name : "";
			if (actionName.length > maxActionName) 
				actionName = _.truncate(ctx.action.name, { length: maxActionName });

			let strAction = [
				r("  ", ctx.level - 1),
				actionName,
				r(" ", maxActionName - actionName.length + 1),
				ctx.cachedResult ? "* " : "",
				ctx.remoteCall ? "» " : "",
				ctx.duration,
				"ms "
			].join("");

			if (ctx.startTime == null || ctx.stopTime == null) {
				this.logger.debug(strAction + "! Missing invoke !");
				return;
			}

			let gstart = (ctx.startTime - this.startTime) / (this.stopTime - this.startTime) * 100;
			let gstop = (ctx.stopTime - this.startTime) / (this.stopTime - this.startTime) * 100;

			if (_.isNaN(gstart) && _.isNaN(gstop)) {
				gstart = 0;
				gstop = 100;
			}

			let p1 = Math.round(gw * gstart / 100);
			let p2 = Math.round(gw * gstop / 100) - p1;
			let p3 = Math.max(gw - (p1 + p2), 0);

			let gauge = [
				"[",
				r(".", p1),
				r("■", p2),
				r(".", p3),
				"]"
			].join("");

			this.logger.debug("│ " + strAction + gauge + " │");

			if (ctx.subContexts.length > 0)
				ctx.subContexts.forEach(subCtx => printCtxTime(subCtx));
		};

		printCtxTime(this);
		this.logger.debug(["└", r("─", w-2), "┘"].join(""));
	}
}

module.exports = Context;