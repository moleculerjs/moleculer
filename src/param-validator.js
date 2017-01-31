/*
 * servicer
 * Copyright (c) 2017 Icebob (https://github.com/icebob/servicer)
 * MIT Licensed
 */

"use strict";

const _  = require("lodash");
const Validator = require("validatorjs");
const { ValidationError } = require("./errors");

class ParamValidator {

	constructor(service) {
		this.service = service;
	}

	validate(schema, params) {
		let validation = new Validator(params, schema);
		const res = validation.passes();
		if (!res)
			throw new ValidationError("Parameters validation error!", validation.errors.all());
		
		return true;
	}

}


module.exports = ParamValidator;
