/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const BaseLogger = require("./base");
const _ = require("lodash");

/**
 * Winston logger for Moleculer
 *
 * https://github.com/winstonjs/winston
 *
 * @class WinstonLogger
 * @extends {BaseLogger}
 */
class WinstonLogger extends BaseLogger {

	/**
	 * Creates an instance of WinstonLogger.
	 * @param {Object} opts
	 * @memberof WinstonLogger
	 */
	constructor(opts) {
		super(opts);

		this.opts = _.defaultsDeep(this.opts, {});
	}

}

module.exports = WinstonLogger;
