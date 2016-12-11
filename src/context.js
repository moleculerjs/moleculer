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
		//
	}

	error(data) {
		//
	}

	call(actionName, params) {
		let p;
		if (_.isObject(params))
			p = Object.freeze(Object.assign({}, params));

		return this.broker.call(actionName, p, this);
	}	
}

module.exports = Context;