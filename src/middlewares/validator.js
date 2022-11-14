/*
 * moleculer
 * Copyright (c) 2021 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const { isFunction } = require("../utils");

module.exports = function ValidatorMiddleware(broker) {
	if (broker.validator && isFunction(broker.validator.middleware)) {
		return broker.validator.middleware(broker);
	}

	return null;
};
