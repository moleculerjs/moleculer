/*
 * moleculer
 * Copyright (c) 2021 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const { isFunction, deprecate } = require("../utils");

module.exports = function CacherMiddleware(broker) {
	if (broker.cacher) {
		const mw = broker.cacher.middleware();
		if (isFunction(mw)) {
			deprecate(
				"Validator middleware returning a Function is deprecated. Return a middleware object instead."
			);

			return {
				name: "Cacher",
				localAction: mw
			};
		}

		return mw;
	}

	return null;
};
