/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const { match }	= require("../utils");

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
	 * @param {LogFactory} logFactory
	 * @memberof BaseLogger
	 */
	constructor(opts) {
		//this.logFactory = logFactory;

		this.opts = _.defaultsDeep(opts, {
			level: "info",
		});

	}

	/**
	 * Initialize logger.
	 *
	 * @param {LogFactory} logFactory
	 */
	init(logFactory)  {
		this.logFactory = logFactory;
		this.broker = this.logFactory.broker;
	}


	getLogLevel(mod) {
		mod = mod ? mod.toUpperCase() : "";

		const level = this.opts.level;
		if (_.isString(level))
			return level;

		if (_.isObject(level)) {
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

		return null;
	}

	getLogHandler(/*bindings*/) {
		return null;
	}

	/**
	 * Extend a logger class if missing common log level methods
	 *
	 * @param {Object} logger
	 * @returns {Object} logger
	 */
	extend(logger) {
		LEVELS.forEach(type => {
			let method = logger[type];
			if (!method) {
				switch(type) {
					case "fatal":method = logger["error"] || logger["info"]; break;
					case "trace": method = logger["debug"] || logger["info"]; break;
					default: method = logger["info"];
				}
				logger[type] = method.bind(logger);
			}
		});
		return logger;
	}
}

BaseLogger.LEVELS = LEVELS;

module.exports = BaseLogger;
