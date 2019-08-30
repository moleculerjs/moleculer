/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const BaseLogger = require("./base");
const _ = require("lodash");

/**
 * Pino logger for Moleculer
 *
 * @class PinoLogger
 * @extends {BaseLogger}
 */
class PinoLogger extends BaseLogger {

	/**
	 * Creates an instance of PinoLogger.
	 * @param {Object} opts
	 * @memberof PinoLogger
	 */
	constructor(opts) {
		super(opts);

		this.opts = _.defaultsDeep(this.opts, {});
	}

}

module.exports = PinoLogger;
