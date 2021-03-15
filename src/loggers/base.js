/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const { match, isObject, isString }	= require("../utils");

const LEVELS = ["fatal", "error", "warn", "info", "debug", "trace"];

/**
 * Logger base class.
 *
 * @class BaseLogger
 */
class BaseLogger {

	/**
	 * Creates an instance of BaseLogger.
	 *
	 * @param {Object} opts
	 * @memberof BaseLogger
	 */
	constructor(opts) {
		this.opts = _.defaultsDeep(opts, {
			level: "info",
			createLogger: null
		});
		this.Promise = Promise; // default promise before logger is initialized
	}

	/**
	 * Initialize logger.
	 *
	 * @param {LoggerFactory} loggerFactory
	 */
	init(loggerFactory)  {
		this.loggerFactory = loggerFactory;
		this.broker = this.loggerFactory.broker;
		this.Promise = this.broker.Promise;
	}

	/**
	 * Stopping logger
	 */
	stop() {
		return this.Promise.resolve();
	}

	getLogLevel(mod) {
		mod = mod ? mod.toUpperCase() : "";

		const level = this.opts.level;
		if (isString(level))
			return level;

		if (isObject(level)) {
			if (level[mod])
				return level[mod];

			// Find with matching
			const key = Object.keys(level).find(m => match(mod, m) && m !== "**");
			if (key)
				return level[key];
			else if (level["**"]) {
				return level["**"];
			}
		}

		/* istanbul ignore next */
		return null;
	}

	getLogHandler(/*bindings*/) {
		return null;
	}
}

BaseLogger.LEVELS = LEVELS;

module.exports = BaseLogger;
