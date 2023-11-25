/*
 * moleculer
 * Copyright (c) 2023 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

/* eslint-disable no-unused-vars */

"use strict";

const { ValidationError } = require("../errors");
const _ = require("lodash");

/**
 * Import types
 *
 * @typedef {import("../service-broker")} ServiceBroker
 * @typedef {import("../context")} Context
 * @typedef {import("./base")} BaseValidatorClass
 * @typedef {import("./base").ValidatorOptions} ValidatorOptions
 * @typedef {import("./base").CheckerFunction} CheckerFunction
 */

/**
 * Abstract validator class
 *
 * @implements {BaseValidatorClass}
 */
class BaseValidator {
	/**
	 * Creates an instance of Validator.
	 *
	 * @param {ValidatorOptions} opts
	 *
	 * @memberof Cacher
	 */
	constructor(opts) {
		/** @type {ValidatorOptions} */
		this.opts = _.defaultsDeep(opts, {
			paramName: "params"
		});
	}

	/**
	 * Initialize cacher
	 *
	 * @param {ServiceBroker} broker
	 *
	 * @memberof Cacher
	 */
	init(broker) {
		this.broker = broker;
	}

	/**
	 * Compile a validation schema to a checker function.
	 *
	 * @param {Record<string, any>} schema
	 * @returns {CheckerFunction}
	 */
	compile(schema) {
		throw new Error("Abstract method");
	}

	/**
	 * Validate params againt the schema
	 *
	 * @param {Record<string, any>} params
	 * @param {Record<string, any>} schema
	 * @returns {boolean}
	 */
	validate(params, schema) {
		throw new Error("Abstract method");
	}

	/**
	 * Convert the specific validation schema to
	 * the Moleculer (fastest-validator) validation schema format.
	 *
	 * @param {Record<string, any>} schema
	 * @returns {Object}
	 */
	convertSchemaToMoleculer(schema) {
		throw new Error("Abstract method");
	}

	/**
	 * Register validator as a middleware
	 *
	 * @param {ServiceBroker} broker
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
						const res = check(ctx.params != null ? ctx.params : {}, { meta: ctx });
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
						const res = check(ctx.params != null ? ctx.params : {}, { meta: ctx });

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
