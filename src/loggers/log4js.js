/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const BaseLogger = require("./base");
const _ = require("lodash");
const { isFunction } = require("../utils");

/**
 * Log4js logger for Moleculer
 *
 * https://github.com/log4js-node/log4js-node
 *
 * @class Log4jsLogger
 * @extends {BaseLogger}
 */
class Log4jsLogger extends BaseLogger {

	/**
	 * Creates an instance of Log4jsLogger.
	 * @param {Object} opts
	 * @memberof Log4jsLogger
	 */
	constructor(opts) {
		super(opts);

		this.opts = _.defaultsDeep(this.opts, {
		});
	}

	/**
	 * Initialize logger.
	 *
	 * @param {LoggerFactory} loggerFactory
	 */
	init(loggerFactory) {
		super.init(loggerFactory);

		try {
			this.log4js = require("log4js");
			if (this.opts.log4js) {
				this.log4js.configure(this.opts.log4js);
			}
		} catch(err) {
			/* istanbul ignore next */
			this.broker.fatal("The 'log4js' package is missing! Please install it with 'npm install log4js --save' command!", err, true);
		}
	}

	/**
	 * Stopping logger
	 */
	stop() {
		if (this.log4js) {
			return new Promise(resolve => this.log4js.shutdown(resolve));
		}

		return Promise.resolve();
	}

	/**
	 *
	 * @param {object} bindings
	 */
	getLogHandler(bindings) {
		let level = bindings ? this.getLogLevel(bindings.mod) : null;
		if (!level)
			return null;

		let logger;
		if (isFunction(this.opts.createLogger))
			logger = this.opts.createLogger(level, bindings);
		else {
			logger = this.log4js.getLogger(bindings.mod.toUpperCase());
			logger.level = level;
		}

		return (type, args) => logger[type](...args);
	}
}

module.exports = Log4jsLogger;
