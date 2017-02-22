/*
 * moleculer
 * Copyright (c) 2017 Icebob (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const _  = require("lodash");
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
		return function validatorMiddleware(handler, action) {
			// Wrap a param validator
			if (_.isObject(action.params)) {
				return ctx => {
					this.validate(action.params, ctx.params);
					return handler(ctx);
				};
			}
			return handler;
		}.bind(this);
	}

}


module.exports = ParamValidator;
