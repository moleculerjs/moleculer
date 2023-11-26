/*
 * moleculer
 * Copyright (c) 2023 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

/* eslint-disable no-unused-vars */

"use strict";

const _ = require("lodash");
const { match, isObject, isString } = require("../utils");

const LEVELS = ["fatal", "error", "warn", "info", "debug", "trace"];

/**
 * Import types
 *
 * @typedef {import("../logger-factory")} LoggerFactory
 * @typedef {import("../logger-factory").LoggerBindings} LoggerBindings
 * @typedef {import("./base").LoggerOptions} LoggerOptions
 * @typedef {import("./base")} BaseLoggerClass
 */

/**
 * Logger base class.
 *
 * @implements {BaseLoggerClass}
 */
class BaseLogger {
	/**
	 * Creates an instance of BaseLogger.
	 *
	 * @param {LoggerOptions} opts
	 * @memberof BaseLogger
	 */
	constructor(opts) {
		/** @type {LoggerOptions} */
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
	init(loggerFactory) {
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
		if (isString(level)) return level;

		if (isObject(level)) {
			if (level[mod]) return level[mod];

			// Find with matching
			const key = Object.keys(level).find(m => match(mod, m) && m !== "**");
			if (key) return level[key];
			else if (level["**"]) {
				return level["**"];
			}
		}

		/* istanbul ignore next */
		return null;
	}

	/**
	 *
	 * @param {LoggerBindings?} bindings
	 */
	getLogHandler(bindings) {
		return null;
	}
}

BaseLogger.LEVELS = LEVELS;

module.exports = BaseLogger;
