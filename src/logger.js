/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const isString  = require("lodash/isString");
const isObject  = require("lodash/isObject");

module.exports = {
	
	/**
	 * Create a sub-logger by external logger.
	 * 
	 * @param {any} extLogger
	 * @param {any} moduleName
	 * @param {any} logLevel
	 * @returns
	 */
	wrap(extLogger, moduleName, logLevel) {
		let noop = function() {};

		const levels = ["fatal", "error", "warn", "info", "debug", "trace"];
		let prefix = moduleName? "[" + moduleName + "] " : "";

		let logger = {};
		levels.forEach((type) => logger[type] = noop);
		
		if (extLogger) {

			let levelIdx = -1;
			if (isString(logLevel))
				levelIdx = levels.indexOf(logLevel);
			else if (isObject(logLevel)) {
				let customLevel = logLevel[moduleName];
				if (customLevel == null)
					customLevel = logLevel["*"];

				if (customLevel == null || customLevel === false)
					levelIdx = -1;
				else
					levelIdx = levels.indexOf(customLevel);
			}

			levels.forEach((type, i) => {
				if (i > levelIdx) return;

				let externalMethod = extLogger[type];
				if (!externalMethod) {
					switch(type) {
					case "fatal":
					case "warn": externalMethod = extLogger["error"] || extLogger["info"]; break;
					case "debug": externalMethod = extLogger["info"]; break;
					case "trace": externalMethod = extLogger["debug"] || extLogger["info"]; break;
					default: externalMethod = extLogger["info"];
					}
				}

				if (externalMethod) {
					logger[type] = function(msg, ...args) {
						externalMethod(prefix + msg, ...args);
					}.bind(extLogger);
				}
			});
		}

		return logger;		
	}

};