/*
 * moleculer
 * Copyright (c) 2018 Ice Services (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const chalk 	= require("chalk");
const _ 		= require("lodash");
const util 		= require("util");

const LOG_LEVELS = ["fatal", "error", "warn", "info", "debug", "trace"];

module.exports = {

	/**
	 * Extend a logger class if missing log level methods
	 *
	 * @param {Object} logger
	 * @returns {Object} logger
	 */
	extend(logger) {
		LOG_LEVELS.forEach(type => {
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
	},

	/**
	 * Create a default logger for `console` logger.
	 *
	 * @param {Object} baseLogger
	 * @param {Object} bindings
	 * @param {String?} logLevel
	 * @param {Function?} logFormatter Custom log formatter function
	 * @returns {Object} logger
	 */
	createDefaultLogger(baseLogger, bindings, logLevel, logFormatter) {
		const noop = function() {};

		const getModuleName = () => {
			let mod;
			if (bindings.svc) {
				mod = bindings.svc.toUpperCase();
				if (bindings.ver) {
					mod += ":" + (typeof(bindings.ver) == "number" ? "v" + bindings.ver : bindings.ver);
				}
			} else if (bindings.mod)
				mod = bindings.mod.toUpperCase();

			return bindings.nodeID + "/" + mod;
		};

		const getColor = type => {
			switch(type) {
				case "fatal": return chalk.red.inverse;
				case "error": return chalk.red;
				case "warn": return chalk.yellow;
				case "debug": return chalk.magenta;
				case "trace": return chalk.gray;
				default: return chalk.green;
			}
		};
		const getType = type => getColor(type)(_.padEnd(type.toUpperCase(), 5));

		let logger = {};
		LOG_LEVELS.forEach((type, i) => {
			if (!baseLogger || (logLevel && i > LOG_LEVELS.indexOf(logLevel))) {
				logger[type] = noop;
				return;
			}

			let method = baseLogger[type];

			/* istanbul ignore next */
			if (baseLogger === console && process.versions.node.split(".")[0] >= 8 && type === "debug")
				method = null;

			if (!method) {
				switch(type) {
					case "fatal":method = baseLogger["error"] || baseLogger["info"]; break;
					case "trace": method = baseLogger["debug"] || baseLogger["info"]; break;
					default: method = baseLogger["info"];
				}
			}

			// Wrap the original method
			logger[type] = function(...args) {
				const format = logFormatter;
				if (_.isFunction(format))
					return method.call(baseLogger, logFormatter(type, args, bindings));

				// Format arguments (inspect & colorize the objects & array)
				let pargs = args.map(p => {
					if (_.isObject(p) || _.isArray(p))
						return util.inspect(p, { showHidden: false, depth: 2, colors: chalk.enabled });
					return p;
				});

				if (format == "simple") {
					method.call(baseLogger, getType(type), "-", ...pargs);
				} else {
					method.call(baseLogger, chalk.grey(`[${new Date().toISOString()}]`), getType(type), chalk.grey(getModuleName() + ":"), ...pargs);
				}

			}.bind(baseLogger);

		});

		return logger;
	}

};
