"use strict";

let _ = require("lodash");
let chalk = require("chalk");

let bus = require("./service-bus");
let utils = require("./utils");

class Context {

	constructor(opts) {
		opts = Object.assign({}, opts || {});
	
		this.opts = opts;
		this.id = opts.id || utils.generateToken();
		this.parent = opts.parent;
		this.service = opts.service;
		this.action = opts.action;
		this.broker = opts.service && opts.service.$broker;
		this.level = opts.parent && opts.parent.level ? opts.parent.level + 1 : 1;
		this.params = Object.freeze(Object.assign({}, opts.params || {}));

		this.startTime = Date.now();
		this.stopTime = null;
		this.duration = 0;
	}

	createSubContext(service, action, params) {
		return new Context({
			id: this.id,
			parent: this,
			service: service || this.service,
			action: action || this.action,
			params: params
		});
	}

	setParams(newParams) {
		this.params = Object.freeze(Object.assign({}, newParams));
	}

	emit(eventName, data) {
		let d;
		if (_.isObject(data))
			d = Object.freeze(Object.assign({}, data));
		else
			d = data;

		return bus.emit(eventName, d);
	}

	closeContext() {
		this.stopTime = Date.now();
		this.duration = this.stopTime - this.startTime;
		if (this.parent) {
			this.parent.duration += this.duration;
		}
	}

	result(data) {
		this.closeContext();
		this.log(chalk.green(`[${this.duration}ms] result:`), this.params);
		return Promise.resolve(data);
	}

	error(err) {
		this.closeContext();
		console.log(chalk.red.bold(`[${this.duration}ms] error:`), err);
		return Promise.reject(err);
	}

	call(actionName, params) {
		return this.broker.call(actionName, params, this);
	}	

	log(str, params) {
		/*let line = [];
		_.times(this.level - 1, () => line.push("  "));
		line.push(str);
		if (params) {
			line.push(" ");
			line.push(chalk.yellow(JSON.stringify(this.params)));
		}

		console.log(line.join(""));*/
	}
}

module.exports = Context;