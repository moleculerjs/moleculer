/*
 * moleculer
 * Copyright (c) 2023 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

/* eslint-disable no-console */

"use strict";

const FormattedLogger = require("./formatted");
const kleur = require("kleur");

/**
 * Import types
 *
 * @typedef {import("../logger-factory")} LoggerFactory
 * @typedef {import("../logger-factory").LoggerBindings} LoggerBindings
 * @typedef {import("./console").ConsoleLoggerOptions} ConsoleLoggerOptions
 * @typedef {import("./console")} ConsoleLoggerClass
 */

/**
 * Console logger for Moleculer
 *
 * @class ConsoleLogger
 * @implements {ConsoleLoggerClass}
 * @extends {FormattedLogger<ConsoleLoggerOptions>}
 */
class ConsoleLogger extends FormattedLogger {
	/**
	 * Creates an instance of ConsoleLogger.
	 * @param {ConsoleLoggerOptions} opts
	 * @memberof ConsoleLogger
	 */
	constructor(opts) {
		super(opts);

		this.maxPrefixLength = 0;
	}

	/**
	 * Initialize logger.
	 *
	 * @param {LoggerFactory} loggerFactory
	 */
	init(loggerFactory) {
		super.init(loggerFactory);

		if (!this.opts.colors) kleur.enabled = false;
	}

	/**
	 *
	 * @param {LoggerBindings} bindings
	 */
	getLogHandler(bindings) {
		const level = bindings ? this.getLogLevel(bindings.mod) : null;
		if (!level) return null;

		const levelIdx = FormattedLogger.LEVELS.indexOf(level);
		const formatter = this.getFormatter(bindings);

		return (type, args) => {
			const typeIdx = FormattedLogger.LEVELS.indexOf(type);
			if (typeIdx > levelIdx) return;

			const pargs = formatter(type, args);
			switch (type) {
				case "fatal":
				case "error":
					return console.error(...pargs);
				case "warn":
					return console.warn(...pargs);
				default:
					return console.log(...pargs);
			}
		};
	}
}

module.exports = ConsoleLogger;
