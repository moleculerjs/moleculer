/*
 * moleculer
 * Copyright (c) 2021 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const utils = require("../utils");

module.exports = function CacherMiddleware(broker) {
	if (broker.cacher) {
		const mw = broker.cacher.middleware();
		if (utils.isPlainObject(mw)) return mw;

		return {
			name: "Cacher",
			localAction: mw
		};
	}

	return null;
};
