/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const Promise = require("bluebird");
const Validator = require("fastest-validator");
const { ValidationError } = require("./errors");

class ParamValidator {

	constructor() {
		this.validator = new Validator();
	}

	init(broker) {
		this.broker = broker;
	}

	compile(schema) {
		return this.validator.compile(schema);
	}

	validate(params, schema) {
		const res = this.validator.validate(params, schema);
		if (res !== true)
			throw new ValidationError("Parameters validation error!", null, res);

		return true;
	}

	/**
	 * Register validator as a middleware
	 *
	 * @memberof ParamValidator
	 */
	middleware() {
		return function validatorMiddleware(handler, action) {
			// Wrap a param validator
			if (action.params && typeof action.params === "object") {
				const check = this.compile(action.params);
				return function validateContextParams(ctx) {
					let res = check(ctx.params != null ? ctx.params : {});
					if (res === true)
						return handler(ctx);
					else {
						res = res.map(data => Object.assign(data, { nodeID: ctx.nodeID, action: ctx.action.name }));
						return Promise.reject(new ValidationError("Parameters validation error!", null, res));
					}
				};
			}
			return handler;
		}.bind(this);
	}

}


module.exports = ParamValidator;
