/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const Promise = require("bluebird");
const Validator = require("validatorjs");
const { ValidationError } = require("./errors");

class ParamValidator {

	constructor() {
	}

	init(broker) {
		this.broker = broker;
		if (this.broker) {
			broker.use(this.middleware());
		}
	}

	validate(schema, params) {
		let validation = new Validator(params, schema);
		const res = validation.passes();
		if (!res)
			throw new ValidationError("Parameters validation error!", validation.errors.all());
		
		return true;
	}

	/**
	 * Register validator as a middleware
	 * 
	 * @memberOf ParamValidator
	 */
	middleware() {
		let validate = Promise.method(this.validate);
		return function validatorMiddleware(handler, action) {
			// Wrap a param validator
			if (action.params && typeof action.params == "object") {
				return ctx => validate(action.params, ctx.params).then(() => handler(ctx));
			}
			return handler;
		}.bind(this);
	}

}


module.exports = ParamValidator;
