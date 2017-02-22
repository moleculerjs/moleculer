/*
 * moleculer
 * Copyright (c) 2017 Icebob (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const _  = require("lodash");

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

		const levels = ["error", "warn", "info", "debug"];
		let prefix = moduleName? "[" + moduleName + "] " : "";

		let logger = {};
		levels.forEach((type) => logger[type] = noop);
		
		if (extLogger) {

			let levelIdx = -1;
			if (_.isString(logLevel))
				levelIdx = levels.indexOf(logLevel);
			else if (_.isObject(logLevel)) {
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

				let externalMethod = extLogger[type] || extLogger.info || extLogger.log;
				if (externalMethod) {
					logger[type] = function(msg, ...args) {
						externalMethod(prefix + msg, ...args);
					}.bind(extLogger);
				}
			});
		}

		logger.log = logger.info;

		return logger;		
	}

};