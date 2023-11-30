/*
 * moleculer
 * Copyright (c) 2023 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const { isPlainObject, isString } = require("./utils");
const Loggers = require("./loggers");

const noop = () => {};
const cwd = process.cwd();

/**
 * Import types
 *
 * @typedef {import("./service-broker")} ServiceBroker
 * @typedef {import("./logger-factory")} LoggerFactoryClass
 * @typedef {import("./logger-factory").LoggerBindings} LoggerBindings
 * @typedef {import("./logger-factory").Logger} Logger
 * @typedef {import("./loggers/base")} BaseLogger
 */

/**
 * Log factory class.
 *
 * @implements {LoggerFactoryClass}
 */
class LoggerFactory {
	/**
	 * Constructor of LoggerFactory
	 *
	 * @param {ServiceBroker} broker
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

		if (opts === false || opts == null) {
			// No logger
			this.appenders = [];
		} else if (opts === true || opts === console) {
			// Default console logger
			this.appenders = [
				Loggers.resolve({
					type: "Console",
					options: {
						level: globalLogLevel
					}
				})
			];
		} else {
			if (!Array.isArray(opts)) {
				opts = [opts];
			}

			this.appenders = _.compact(opts).map(o => {
				// Built-in shorthand
				if (isString(o))
					return Loggers.resolve({ type: o, options: { level: globalLogLevel } });

				// Build-in with options
				if (isPlainObject(o))
					return Loggers.resolve(
						_.defaultsDeep({}, o, { options: { level: globalLogLevel } })
					);

				// Custom logger instance
				return Loggers.resolve(o);
			});
		}

		// Initialize appenders
		this.appenders.forEach(app => app.init(this));
	}

	/**
	 * Stopping all appenders
	 */
	stop() {
		return this.broker.Promise.all(this.appenders.map(appender => appender.stop()));
	}

	/**
	 * Get caller information from error stack trace.
	 */
	getCallerFromStack() {
		const _prepareStackTrace = Error.prepareStackTrace;
		Error.prepareStackTrace = (_, stack) => stack;
		const stack = new Error().stack;
		Error.prepareStackTrace = _prepareStackTrace;

		if (stack.length > 2) {
			const site = stack[2];
			return {
				filename: site.getFileName().substring(cwd.length + 1),
				lineNumber: site.getLineNumber(),
				columnNumber: site.getColumnNumber(),
				methodName: site.getMethodName(),
				functionName: site.getFunctionName()
			};
		}
	}

	/**
	 * Get a logger for a module (service, transporter, cacher, context...etc)
	 *
	 * @param {LoggerBindings} bindings
	 * @returns {Logger}
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
		const hasNewLogEntryMiddleware =
			broker.middlewares && broker.middlewares.registeredHooks.newLogEntry;

		Loggers.LEVELS.forEach(type => {
			if (logHandlers.length == 0 && !hasNewLogEntryMiddleware) return (logger[type] = noop);

			logger[type] = function (...args) {
				if (hasNewLogEntryMiddleware)
					broker.middlewares.callSyncHandlers("newLogEntry", [type, args, bindings], {});

				if (logHandlers.length === 0) return;

				for (let i = 0; i < logHandlers.length; i++) logHandlers[i](type, args);
			};
		});

		/*logger.log = function(type, ...args) {
			if (broker.middlewares)
				broker.middlewares.callSyncHandlers("newLogEntry", [type, args, bindings], {});

			if (logHandlers.length === 0) return;

			logHandlers.forEach(fn => fn(type, args));
		};*/

		logger.appenders = appenders;

		this.cache.set(this.getBindingsKey(bindings), logger);

		return logger;
	}

	/**
	 * Create a key from bindings for logger caching.
	 *
	 * @param {LoggerBindings} bindings
	 * @returns {String}
	 */
	getBindingsKey(bindings) {
		if (!bindings) return "";

		return ["nodeID", "ns", "mod"].map(key => bindings[key]).join("|");
	}
}

module.exports = LoggerFactory;
