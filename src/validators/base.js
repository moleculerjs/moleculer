/*
 * moleculer
 * Copyright (c) 2020 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const { ValidationError } = require("../errors");
const _ = require("lodash");

class BaseValidator {
	constructor(opts) {
		this.opts = _.defaultsDeep(opts, {
			paramName: "params"
		});
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
		const paramName = this.opts.paramName;

		const processCheckResponse = function (ctx, handler, res, additionalInfo) {
			if (res === true) return handler(ctx);
			else {
				res = res.map(data => Object.assign(data, additionalInfo));
				return broker.Promise.reject(
					new ValidationError("Parameters validation error!", null, res)
				);
			}
		};

		return {
			name: "Validator",
			localAction: function validatorMiddleware(handler, action) {
				// Wrap a param validator
				if (action[paramName] && typeof action[paramName] === "object") {
					const check = self.compile(action[paramName]);
					return function validateContextParams(ctx) {
						const params = ctx.params != null ? ctx.params : {};
						const res = check(params, { meta: ctx });
						ctx.params = params;
						if (check.async)
							return res.then(res =>
								processCheckResponse(ctx, handler, res, {
									nodeID: ctx.nodeID,
									action: ctx.action.name
								})
							);
						else
							return processCheckResponse(ctx, handler, res, {
								nodeID: ctx.nodeID,
								action: ctx.action.name
							});
					};
				}
				return handler;
			},

			localEvent: function validatorMiddleware(handler, event) {
				// Wrap a param validator
				if (event[paramName] && typeof event[paramName] === "object") {
					const check = self.compile(event[paramName]);
					return function validateContextParams(ctx) {
						const params = ctx.params != null ? ctx.params : {};
						const res = check(params, { meta: ctx });
						ctx.params = params;
						if (check.async)
							return res.then(res =>
								processCheckResponse(ctx, handler, res, {
									nodeID: ctx.nodeID,
									event: ctx.event.name
								})
							);
						else
							return processCheckResponse(ctx, handler, res, {
								nodeID: ctx.nodeID,
								event: ctx.event.name
							});
					};
				}
				return handler;
			}
		};
	}
}

module.exports = BaseValidator;
