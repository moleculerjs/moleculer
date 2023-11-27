/*
 * moleculer
 * Copyright (c) 2023 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const BaseLogger = require("./base");
const _ = require("lodash");
const { isFunction } = require("../utils");

/**
 * Import types
 *
 * @typedef {import("../logger-factory")} LoggerFactory
 * @typedef {import("../logger-factory").LoggerBindings} LoggerBindings
 * @typedef {import("./pino").PinoLoggerOptions} PinoLoggerOptions
 * @typedef {import("./pino")} PinoLoggerClass
 */

/**
 * Pino logger for Moleculer
 *
 * https://github.com/pinojs/pino
 *
 * @class PinoLogger
 * @implements {PinoLoggerClass}
 * @extends {BaseLogger<PinoLoggerOptions>}
 */
class PinoLogger extends BaseLogger {
	/**
	 * Creates an instance of PinoLogger.
	 * @param {PinoLoggerOptions} opts
	 * @memberof PinoLogger
	 */
	constructor(opts) {
		super(opts);

		/** @type {PinoLoggerOptions} */
		this.opts = _.defaultsDeep(this.opts, {
			pino: {
				// http://getpino.io/#/docs/api?id=options-object
				options: null,
				// http://getpino.io/#/docs/api?id=destination-sonicboom-writablestream-string
				destination: null
			}
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
			const Pino = require("pino");
			this.pino = Pino(
				this.opts.pino && this.opts.pino.options ? this.opts.pino.options : undefined,
				this.opts.pino && this.opts.pino.destination
					? this.opts.pino.destination
					: undefined
			);
		} catch (err) {
			/* istanbul ignore next */
			this.broker.fatal(
				"The 'pino' package is missing! Please install it with 'npm install pino --save' command!",
				err,
				true
			);
		}
	}

	/**
	 *
	 * @param {LoggerBindings} bindings
	 */
	getLogHandler(bindings) {
		let level = bindings ? this.getLogLevel(bindings.mod) : null;
		if (!level) return null;

		const logger = isFunction(this.opts.createLogger)
			? this.opts.createLogger(level, bindings)
			: this.pino.child(bindings, { level });

		return (type, args) => logger[type](...args);
	}
}

module.exports = PinoLogger;
