/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const BaseLogger = require("./base");
const _ = require("lodash");

/**
 * Debug logger for Moleculer
 *
 * @class DebugLogger
 * @extends {BaseLogger}
 */
class DebugLogger extends BaseLogger {

	/**
	 * Creates an instance of DebugLogger.
	 * @param {Object} opts
	 * @memberof DebugLogger
	 */
	constructor(opts) {
		super(opts);

		this.opts = _.defaultsDeep(this.opts, {});
	}

}

module.exports = DebugLogger;
