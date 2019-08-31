/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ 		= require("lodash");
//const { match }	= require("./utils");
const { BrokerOptionsError } = require("./errors");
const Loggers = require("./loggers");


/**
 * Log factory class.
 *
 * @class LogFactory
 */
class LogFactory {

	/**
	 * Constructor of LogFactory
	 */
	constructor(broker) {
		this.broker = broker;
		this.appenders = [];
		this.cache = new Map();
	}

	/**
	 * Initialize module.
	 */
	init(opts) {
		this.opts = opts;

		const globalLogLevel = this.broker.options.logLevel || "info";

		if (this.opts === false || this.opts == null) {
			// No logger
			this.appenders = [];

		} else if (this.opts === true || this.opts === console) {
			// Default console logger
			this.appenders = [Loggers.resolve({
				type: "Console",
				options: {
					level: globalLogLevel
				}
			})];

		} else if (_.isPlainObject(this.opts) || _.isString(this.opts)) {
			// One logger
			this.appenders = [Loggers.resolve(_.defaultsDeep(this.opts, { options: { level: globalLogLevel } }))];
		} else if (Array.isArray(this.opts)) {
			// Multiple loggers
			this.appenders = this.opts.map(o => Loggers.resolve(_.defaultsDeep(o, { options: { level: globalLogLevel } })));
		} else {
			// Invalid options
			throw new BrokerOptionsError("Invalid logger configuration.", { opts: this.opts });
		}

		// Initialize appenders
		this.appenders.forEach(app => app.init(this));
	}


	/**
	 * Get a logger for a module (service, transporter, cacher, context...etc)
	 *
	 * @param {Object} bindings
	 * @returns {ModuleLogger}
	 *
	 * @memberof ServiceBroker
	 */
	getLogger(bindings) {
		let logger = this.cache.get(this.getBindingsKey(bindings));
		if (logger) return logger;

		logger = {};
		const broker = this.broker;
		const appenders = this.appenders;

		const logHandlers = _.compact(appenders.map(app => app.getLogHandler(bindings)));

		Loggers.LEVELS.forEach((type) => {
			logger[type] = function(...args) {
				if (broker.middlewares)
					broker.middlewares.callSyncHandlers("newLogEntry", [type, args, bindings], {});

				if (logHandlers.length == 0) return;

				logHandlers.forEach(fn => fn(type, args));
			};
		});

		/*logger.log = function(type, ...args) {
			if (broker.middlewares)
				broker.middlewares.callSyncHandlers("newLogEntry", [type, args, bindings], {});

			if (logHandlers.length == 0) return;

			logHandlers.forEach(fn => fn(type, args));
		};*/


		this.cache.set(this.getBindingsKey(bindings), logger);

		return logger;
	}

	/**
	 * Create a key from bindings for logger caching.
	 *
	 * @param {object} bindings
	 * @returns {String}
	 */
	getBindingsKey(bindings) {
		return ["nodeID", "ns", "mod"]
			.map(key => bindings[key])
			.join("|");
	}

}

module.exports = LogFactory;
