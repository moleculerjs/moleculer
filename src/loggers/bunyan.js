/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const BaseLogger = require("./base");
const _ = require("lodash");

/**
 * Bunyan logger for Moleculer
 *
 * https://github.com/trentm/node-bunyan
 *
 * @class BunyanLogger
 * @extends {BaseLogger}
 */
class BunyanLogger extends BaseLogger {

	/**
	 * Creates an instance of BunyanLogger.
	 * @param {Object} opts
	 * @memberof BunyanLogger
	 */
	constructor(opts) {
		super(opts);

		this.opts = _.defaultsDeep(this.opts, {});
	}

}

module.exports = BunyanLogger;
