/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const Promise = require("bluebird");
const Validator = require("fast-jsvalidator");
const { ValidationError } = require("./errors");

class ParamValidator {

	constructor() {
		this.validator = new Validator();
	}

	init(broker) {
		this.broker = broker;
		if (this.broker) {
			broker.use(this.middleware());
		}
	}

	compile(schema) {
		return this.validator.compile(schema);
	}

	validate(params, schema) {
		const res = this.validator.validate(params, schema);
		if (res !== true)
			throw new ValidationError("Parameters validation error!", res);
		
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
			if (action.params && typeof action.params === "object") {
				const check = this.compile(action.params);
				return ctx => {
					const res = check(ctx.params);
					if (res === true)
						return handler(ctx);
					else
						return Promise.reject(new ValidationError("Parameters validation error!", res));
				};
			}
			return handler;
		}.bind(this);
	}

}


module.exports = ParamValidator;
