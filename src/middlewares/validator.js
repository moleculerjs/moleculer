/*
 * moleculer
 * Copyright (c) 2021 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const { isFunction, deprecate } = require("../utils");

module.exports = function ValidatorMiddleware(broker) {
	if (broker.validator && isFunction(broker.validator.middleware)) {
		const mw = broker.validator.middleware(broker);
		if (isFunction(mw)) {
			deprecate(
				"Validator middleware returning a Function is deprecated. Return a middleware object instead."
			);
			return {
				name: "Validator",
				localAction: mw
			};
		}
		return mw;
	}

	return null;
};
