/*
 * ice-services
 * Copyright (c) 2017 Norbert Mereg (https://github.com/icebob/ice-services)
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
