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

		this.opts = _.defaultsDeep(this.opts, {
			winston: {
				level: "silly",
			}
		});
	}

	/**
	 * Initialize logger.
	 *
	 * @param {LogFactory} logFactory
	 */
	init(logFactory) {
		super.init(logFactory);

		try {
			this.winston = require("winston").createLogger(this.opts.winston);
		} catch(err) {
			/* istanbul ignore next */
			this.broker.fatal("The 'winston' package is missing! Please install it with 'npm install winston --save' command!", err, true);
		}
	}

	/**
	 *
	 * @param {object} bindings
	 */
	getLogHandler(bindings) {
		let level = bindings ? this.getLogLevel(bindings.mod) : null;
		if (!level)
			return null;

		const levelIdx = BaseLogger.LEVELS.indexOf(level);

		const logger = _.isFunction(this.opts.createLogger) ? this.opts.createLogger(level, bindings) : this.winston.child({ level, ...bindings });

		return (type, args) => {
			const typeIdx = BaseLogger.LEVELS.indexOf(type);
			if (typeIdx > levelIdx) return;

			switch(type) {
				case "info": return logger.info(...args);
				case "fatal":
				case "error": return logger.error(...args);
				case "warn": return logger.warn(...args);
				case "debug": return logger.debug(...args);
				case "trace": return logger.log("silly", ...args);
				default: {
					if (logger[type])
						return logger[type](...args);

					return logger.info(...args);
				}
			}
		};
	}
}

module.exports = WinstonLogger;
