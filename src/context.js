"use strict";

let bus = require("./service-bus");
let utils = require("./utils");

class Context {

	constructor(opts) {
		opts = Object.assign({}, opts || {});

		this.id = opts.id || utils.generateToken();
		this.service = opts.service;
		this.action = opts.action;
		this.broker = opts.service.broker;
		this.level = (opts.level || 0) + 1;
		this.params = Object.freeze(Object.assign({}, opts.params || {}));

		this.startTime = new Date();
		this.stopTime = null;
	}

	setParams(newParams) {
		this.params = Object.freeze(Object.assign({}, newParams));
	}

	emit(eventName, data) {
		return bus.emit(eventName, data);
	}

	result(data) {
		//
	}

	error(data) {
		//
	}

	action(actionName, params) {
		return this.broker.action(actionName, params, this);
	}	
}

module.exports = Context;