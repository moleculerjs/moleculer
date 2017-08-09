/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const chalk 	= require("chalk");
const _ 		= require("lodash");
const util 		= require("util");

const LOG_LEVELS = ["fatal", "error", "warn", "info", "debug", "trace"];

module.exports = {
	
	extend(logger) {
		LOG_LEVELS.forEach((type, i) => {
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
	
	createDefaultLogger(baseLogger, bindings, logLevel) {
		const noop = function() {};

		const getModuleName = () => chalk.grey(bindings.nodeID + "/" + (bindings.service ? bindings.service.toUpperCase() : bindings.module.toUpperCase()));
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
			if (logLevel && i > LOG_LEVELS.indexOf(logLevel)) {
				logger[type] = noop;
				return;
			}

			let method = baseLogger[type];
			if (!method) {
				switch(type) {
					case "fatal":method = baseLogger["error"] || baseLogger["info"]; break;
					case "trace": method = baseLogger["debug"] || baseLogger["info"]; break;
					default: method = baseLogger["info"];
				}
			}

			if (method) {
				logger[type] = function(...args) {
					let pargs = args.map(p => {
						if (_.isObject(p) || _.isArray(p))
							return util.inspect(p, { showHidden: false, depth: 2, colors: true });
						return p;
					});
					method.call(baseLogger, chalk.grey(`[${new Date().toISOString()}]`), getType(type), getModuleName() + ":", ...pargs);
				}.bind(baseLogger);
			}
		});

		return logger;		
	}

};