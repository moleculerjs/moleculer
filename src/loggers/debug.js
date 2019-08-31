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
 * https://github.com/visionmedia/debug
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

	/**
	 * Initialize logger.
	 *
	 * @param {LogFactory} logFactory
	 */
	init(logFactory) {
		super.init(logFactory);

		try {
			this.debug = require("debug")("moleculer");
		} catch(err) {
			/* istanbul ignore next */
			this.broker.fatal("The 'debug' package is missing! Please install it with 'npm install debug --save' command!", err, true);
		}
	}

	/**
	 *
	 * @param {object} bindings
	 */
	getLogHandler(bindings) {
		const mod = bindings ? bindings.mod : null;
		const level = this.getLogLevel(mod);
		if (!level)
			return null;

		const levelIdx = BaseLogger.LEVELS.indexOf(level);

		const logger = _.isFunction(this.opts.createLogger) ? this.opts.createLogger(level, bindings) : this.debug.extend(mod);

		return (type, args) => {
			const typeIdx = BaseLogger.LEVELS.indexOf(type);
			if (typeIdx > levelIdx) return;

			return logger(...args);
		};
	}
}

module.exports = DebugLogger;
