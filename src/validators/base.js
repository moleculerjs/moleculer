/*
 * moleculer
 * Copyright (c) 2020 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const { ValidationError } = require("../errors");

class BaseValidator {

	constructor(opts) {
		this.opts = opts || {};
	}

	init(broker) {
		this.broker = broker;
	}

	/**
	 * Compile a validation schema to a checker function.
	 * @param {any} schema
	 * @returns {Function}
	 */
	compile(/*schema*/) {
		throw new Error("Abstract method");
	}

	/**
	 * Validate params againt the schema
	 * @param {any} params
	 * @param {any} schema
	 * @returns {boolean}
	 */
	validate(/*params, schema*/) {
		throw new Error("Abstract method");
	}

	/**
	 * Convert the specific validation schema to
	 * the Moleculer (fastest-validator) validation schema format.
	 *
	 * @param {any} schema
	 * @returns {Object}
	 */
	convertSchemaToMoleculer(/*schema*/) {
		throw new Error("Abstract method");
	}

	/**
	 * Register validator as a middleware
	 *
	 * @memberof BaseValidator
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


module.exports = BaseValidator;
