/*
 * moleculer
 * Copyright (c) 2021 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const { isFunction } = require("../utils");

module.exports = function ValidatorMiddleware(broker) {
	const { resolveValidator } = require("../validators");

	return resolveValidator({ service: broker }, broker);
};
