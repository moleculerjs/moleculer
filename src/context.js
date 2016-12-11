"use strict";

let _ = require("lodash");
let bus = require("./service-bus");
let utils = require("./utils");

class Context {

	constructor(opts) {
		opts = Object.assign({}, opts || {});

		this.id = opts.id || utils.generateToken256();
		this.service = opts.service;
		this.action = opts.action;
		this.broker = opts.service && opts.service.$broker;
		this.level = (opts.level || 0) + 1;
		this.params = Object.freeze(Object.assign({}, opts.params || {}));

		this.startTime = new Date();
		this.stopTime = null;
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

	result(data) {
		return Promise.resolve(data);
	}

	error(err) {
		return Promise.reject(err);
	}

	call(actionName, params) {
		return this.broker.call(actionName, params, this);
	}	

	log(str) {
		let line = [];
		_.times(this.level - 1, () => line.push("  "));
		line.push(str);

		console.log(line.join(""));
	}
}

module.exports = Context;