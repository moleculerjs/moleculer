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
 * https://github.com/pinojs/pino
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

		this.opts = _.defaultsDeep(this.opts, {
			pino: {
				// http://getpino.io/#/docs/api?id=options-object
				options: null,
				// http://getpino.io/#/docs/api?id=destination-sonicboom-writablestream-string
				destination: null,
			},

			createLogger: null
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
			const Pino = require("pino");
			this.pino = Pino(
				this.opts.pino && this.opts.pino.options ? this.opts.pino.options : undefined,
				this.opts.pino && this.opts.pino.destination ? this.opts.pino.destination : null);
		} catch(err) {
			/* istanbul ignore next */
			this.broker.fatal("The 'pino' package is missing! Please install it with 'npm install pino --save' command!", err, true);
		}
	}

	/**
	 *
	 * @param {object} bindings
	 */
	getLogHandler(bindings) {
		let level = this.getLogLevel(bindings ? bindings.mod : null);
		if (!level)
			return null;

		const logger = _.isFunction(this.opts.createLogger) ? this.opts.createLogger(level, bindings) : this.pino.child({ level, ...bindings });

		return (type, args) => logger[type](...args);
	}

}

module.exports = PinoLogger;
