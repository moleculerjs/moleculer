/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const kleur 	= require("kleur");
const _ 		= require("lodash");
const util 		= require("util");
const { match }	= require("./utils");

const LOG_LEVELS = ["fatal", "error", "warn", "info", "debug", "trace"];

const COLORS = ["cyan", "yellow", "green", "magenta", "red", "blue", "white", "grey"/*,
	"bold.cyan", "bold.yellow", "bold.green", "bold.magenta", "bold.red", "bold.blue", "bold.white", "bold.grey"*/ ];

let colorCnt = 0;
function getNextColor() {
	return COLORS[colorCnt++ % COLORS.length];
}

module.exports = {

	/**
	 * Extend a logger class if missing common log level methods
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
	 * @param {Function?} logObjectPrinter Custom object formatter function
	 * @returns {Object} logger
	 */
	createDefaultLogger(broker, baseLogger, bindings, logLevel) {
		const noop = function() {};
		const defaultLogObjectPrinter = o => util.inspect(o, { showHidden: false, depth: 2, colors: kleur.enabled, breakLength: Number.POSITIVE_INFINITY });

		const c = getNextColor();

		const mod = (bindings && bindings.mod) ? bindings.mod.toUpperCase() : "";
		const modColorName = c.split(".").reduce((a,b) => a[b] || a()[b], kleur)(mod);
		const moduleColorName = bindings ? kleur.grey(bindings.nodeID + "/") + modColorName : "";

		const getColor = type => {
			switch(type) {
				case "fatal": return kleur.red().inverse;
				case "error": return kleur.red;
				case "warn": return kleur.yellow;
				case "debug": return kleur.magenta;
				case "trace": return kleur.gray;
				default: return kleur.green;
			}
		};
		const getType = type => getColor(type)(_.padEnd(type.toUpperCase(), 5));

		let levelIdx = -1;
		if (_.isString(logLevel))
			levelIdx = LOG_LEVELS.indexOf(logLevel);
		else if (_.isObject(logLevel)) {
			let customLevel = logLevel[mod];
			if (customLevel == null) {
				// Find with matching
				const key = Object.keys(logLevel).find(m => match(mod, m));
				if (key)
					customLevel = logLevel[key];
			}

			if (customLevel == null || customLevel === false)
				levelIdx = -1;
			else
				levelIdx = LOG_LEVELS.indexOf(customLevel);
		}

		let logger = {};
		LOG_LEVELS.forEach((type, i) => {
			if (!baseLogger || (i > levelIdx)) {
				logger[type] = noop;
				return;
			}

			let method = baseLogger[type];

			/* istanbul ignore next */
			if (baseLogger === console && type === "debug" && process.versions.node.split(".")[0] >= 8)
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
				const format = broker.options.logFormatter;
				if (_.isFunction(format)) {
					method.call(baseLogger, format(type, args, bindings));
				} else {
					// Format arguments (inspect & colorize the objects & array)
					let pargs = args.map(p => {
						if (_.isObject(p) || _.isArray(p))
							return _.isFunction(broker.options.logObjectPrinter) ? broker.options.logObjectPrinter(p) : defaultLogObjectPrinter(p);
						return p;
					});

					if (format == "simple") {
						method.call(baseLogger, getType(type), "-", ...pargs);
					} else if (format == "short") {
						method.call(baseLogger, kleur.grey(`[${new Date().toISOString().substr(11)}]`), getType(type), modColorName + kleur.grey(":"), ...pargs);
					} else {
						method.call(baseLogger, kleur.grey(`[${new Date().toISOString()}]`), getType(type), moduleColorName + kleur.grey(":"), ...pargs);
					}
				}

				if (broker.middlewares)
					broker.middlewares.newLogEntry(type, args, bindings);

			}.bind(baseLogger);

		});

		return logger;
	}

};
