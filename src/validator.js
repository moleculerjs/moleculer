/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

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
	middleware(broker) {
		const self = this;
		return {
			name: "Validator",
			localAction: function validatorMiddleware(handler, action) {
				// Wrap a param validator
				if (action.params && typeof action.params === "object") {
					const check = self.compile(action.params);
					return function validateContextParams(ctx) {
						let res = check(ctx.params != null ? ctx.params : {});
						if (res === true)
							return handler(ctx);
						else {
							res = res.map(data => Object.assign(data, { nodeID: ctx.nodeID, action: ctx.action.name }));
							return broker.Promise.reject(new ValidationError("Parameters validation error!", null, res));
						}
					};
				}
				return handler;
			},

			localEvent: function validatorMiddleware(handler, event) {
				// Wrap a param validator
				if (event.params && typeof event.params === "object") {
					const check = self.compile(event.params);
					return function validateContextParams(ctx) {
						let res = check(ctx.params != null ? ctx.params : {});
						if (res === true)
							return handler(ctx);
						else {
							res = res.map(data => Object.assign(data, { nodeID: ctx.nodeID, event: ctx.event.name }));
							return broker.Promise.reject(new ValidationError("Parameters validation error!", null, res));
						}
					};
				}
				return handler;
			}
		};
	}
}


module.exports = ParamValidator;
