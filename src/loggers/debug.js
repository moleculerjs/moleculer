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
 * @typedef {import("./debug").DebugLoggerOptions} DebugLoggerOptions
 * @typedef {import("./debug")} DebugLoggerClass
 */

/**
 * Debug logger for Moleculer
 *
 * https://github.com/visionmedia/debug
 *
 * @class DebugLogger
 * @implements {DebugLoggerClass}
 * @extends {BaseLogger<DebugLoggerOptions>}
 */
class DebugLogger extends BaseLogger {
	/**
	 * Creates an instance of DebugLogger.
	 * @param {DebugLoggerOptions} opts
	 * @memberof DebugLogger
	 */
	constructor(opts) {
		super(opts);

		/** @type {DebugLoggerOptions} */
		this.opts = _.defaultsDeep(this.opts, {});
	}

	/**
	 * Initialize logger.
	 *
	 * @param {LoggerFactory} loggerFactory
	 */
	init(loggerFactory) {
		super.init(loggerFactory);

		try {
			this.debug = require("debug")("moleculer");
		} catch (err) {
			/* istanbul ignore next */
			this.broker.fatal(
				"The 'debug' package is missing! Please install it with 'npm install debug --save' command!",
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
		const mod = bindings ? bindings.mod : null;
		const level = this.getLogLevel(mod);
		if (!level) return null;

		const levelIdx = BaseLogger.LEVELS.indexOf(level);

		const logger = isFunction(this.opts.createLogger)
			? this.opts.createLogger(level, bindings)
			: this.debug.extend(mod);

		return (type, args) => {
			const typeIdx = BaseLogger.LEVELS.indexOf(type);
			if (typeIdx > levelIdx) return;

			return logger(...args);
		};
	}
}

module.exports = DebugLogger;
