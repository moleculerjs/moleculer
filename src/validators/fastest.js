/*
 * moleculer
 * Copyright (c) 2023 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const Validator = require("fastest-validator");
const { ValidationError } = require("../errors");
const BaseValidator = require("./base");
const _ = require("lodash");

/**
 * Import types
 *
 * @typedef {import("../service-broker")} ServiceBroker
 * @typedef {import("../context")} Context
 * @typedef {import("./fastest")} FastestValidatorClass
 * @typedef {import("./fastest").FastestValidatorOptions} FastestValidatorOptions
 * @typedef {import("./base").CheckerFunction} CheckerFunction
 * @typedef {import("fastest-validator").default} Validator
 */

/**
 * Fastest validator class
 *
 * @implements {FastestValidatorClass}
 */
class FastestValidator extends BaseValidator {
	/**
	 * Creates an instance of FastestValidator.
	 *
	 * @param {FastestValidatorOptions} opts
	 *
	 */
	constructor(opts) {
		super(opts);
		/** @type {FastestValidatorOptions} */
		this.opts = _.defaultsDeep(this.opts, {
			useNewCustomCheckerFunction: true
		});

		/** @type {Validator} */
		// @ts-ignore
		this.validator = new Validator(this.opts);
	}

	/**
	 * Compile a validation schema to a checker function.
	 * Need a clone because FV manipulate the schema (removing $$... props)
	 *
	 * @param {Record<string, any>} schema
	 * @returns {CheckerFunction}
	 */
	compile(schema) {
		return this.validator.compile(_.cloneDeep(schema));
	}

	/**
	 * Validate params against the schema
	 *
	 * @param {Record<string, any>} params
	 * @param {Record<string, any>} schema
	 * @returns {boolean}
	 */
	validate(params, schema) {
		const res = this.validator.validate(params, _.cloneDeep(schema));
		if (res !== true) throw new ValidationError("Parameters validation error!", null, res);

		return true;
	}

	/**
	 * Convert the specific validation schema to
	 * the Moleculer (fastest-validator) validation schema format.
	 *
	 * @param {Record<string, any>} schema
	 * @returns {Object}
	 */
	convertSchemaToMoleculer(schema) {
		return schema;
	}
}

module.exports = FastestValidator;
