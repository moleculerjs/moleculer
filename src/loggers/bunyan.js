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
 * @typedef {import("./bunyan").BunyanLoggerOptions} BunyanLoggerOptions
 * @typedef {import("./bunyan")} BunyanLoggerClass
 */

/**
 * Bunyan logger for Moleculer
 *
 * https://github.com/trentm/node-bunyan
 *
 * @class BunyanLogger
 * @implements {BunyanLoggerClass}
 */
class BunyanLogger extends BaseLogger {
	/**
	 * Creates an instance of BunyanLogger.
	 * @param {BunyanLoggerOptions} opts
	 * @memberof BunyanLogger
	 */
	constructor(opts) {
		super(opts);

		/** @type {BunyanLoggerOptions} */
		this.opts = _.defaultsDeep(this.opts, {
			bunyan: {
				name: "moleculer"
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
			this.bunyan = require("bunyan").createLogger(this.opts.bunyan);
		} catch (err) {
			/* istanbul ignore next */
			this.broker.fatal(
				"The 'bunyan' package is missing! Please install it with 'npm install bunyan --save' command!",
				err,
				true
			);
		}
	}

	/**
	 *
	 * @param {LoggerBindings?} bindings
	 */
	getLogHandler(bindings) {
		let level = bindings ? this.getLogLevel(bindings.mod) : null;
		if (!level) return null;

		const logger = isFunction(this.opts.createLogger)
			? this.opts.createLogger(level, bindings)
			: this.bunyan.child({ level, ...bindings });

		return (type, args) => logger[type](...args);
	}
}

module.exports = BunyanLogger;
