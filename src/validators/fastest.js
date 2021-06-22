/*
 * moleculer
 * Copyright (c) 2020 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const Validator = require("fastest-validator");
const { ValidationError } = require("../errors");
const BaseValidator = require("./base");
const _ = require("lodash");

class FastestValidator  extends BaseValidator{

	constructor(opts) {
		super(opts);
		this.validator = new Validator(this.opts);
	}

	/**
	 * Compile a validation schema to a checker function.
	 * Need a clone because FV manipulate the schema (removing $$... props)
	 *
	 * @param {any} schema
	 * @returns {Function}
	 */
	compile(schema) {
		return this.validator.compile(_.cloneDeep(schema));
	}

	/**
	 * Validate params againt the schema
	 * @param {any} params
	 * @param {any} schema
	 * @returns {boolean}
	 */
	validate(params, schema) {
		const res = this.validator.validate(params, _.cloneDeep(schema));
		if (res !== true)
			throw new ValidationError("Parameters validation error!", null, res);

		return true;
	}

	/**
	 * Convert the specific validation schema to
	 * the Moleculer (fastest-validator) validation schema format.
	 *
	 * @param {any} schema
	 * @returns {Object}
	 */
	convertSchemaToMoleculer(schema) {
		return schema;
	}
}

module.exports = FastestValidator;
