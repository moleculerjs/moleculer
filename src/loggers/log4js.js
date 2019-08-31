/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const BaseLogger = require("./base");
const _ = require("lodash");

/**
 * Log4Js logger for Moleculer
 *
 * https://github.com/log4js-node/log4js-node
 *
 * @class Log4JsLogger
 * @extends {BaseLogger}
 */
class Log4JsLogger extends BaseLogger {

	/**
	 * Creates an instance of Log4JsLogger.
	 * @param {Object} opts
	 * @memberof Log4JsLogger
	 */
	constructor(opts) {
		super(opts);

		this.opts = _.defaultsDeep(this.opts, {});
	}

}

module.exports = Log4JsLogger;
