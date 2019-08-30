/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const BaseLogger = require("./base");
const _ = require("lodash");

/**
 * File logger for Moleculer
 *
 * @class FileLogger
 * @extends {BaseLogger}
 */
class FileLogger extends BaseLogger {

	/**
	 * Creates an instance of FileLogger.
	 * @param {Object} opts
	 * @memberof FileLogger
	 */
	constructor(opts) {
		super(opts);

		this.opts = _.defaultsDeep(this.opts, {});
	}

}

module.exports = FileLogger;
