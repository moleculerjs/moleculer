/*
 * moleculer
 * Copyright (c) 2020 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

/* eslint-disable no-console */

"use strict";

const FormattedLogger = require("./formatted");
const kleur = require("kleur");

/**
 * Console logger for Moleculer
 *
 * @class ConsoleLogger
 * @extends {FormattedLogger}
 */
class ConsoleLogger extends FormattedLogger {
	/**
	 * Creates an instance of ConsoleLogger.
	 * @param {Object} opts
	 * @memberof ConsoleLogger
	 */
	constructor(opts) {
		super(opts);

		this.maxPrefixLength = 0;
	}

	init(loggerFactory) {
		super.init(loggerFactory);

		if (!this.opts.colors) kleur.enabled = false;
	}

	/**
	 *
	 * @param {object} bindings
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
