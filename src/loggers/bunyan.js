/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const BaseLogger = require("./base");
const _ = require("lodash");

/**
 * Bunyan logger for Moleculer
 *
 * https://github.com/trentm/node-bunyan
 *
 * @class BunyanLogger
 * @extends {BaseLogger}
 */
class BunyanLogger extends BaseLogger {

	/**
	 * Creates an instance of BunyanLogger.
	 * @param {Object} opts
	 * @memberof BunyanLogger
	 */
	constructor(opts) {
		super(opts);

		this.opts = _.defaultsDeep(this.opts, {
			bunyan: {
				name: "moleculer"
			}
		});
	}

	/**
	 * Initialize logger.
	 *
	 * @param {LogFactory} logFactory
	 */
	init(logFactory) {
		super.init(logFactory);

		try {
			this.bunyan = require("bunyan").createLogger(this.opts.bunyan);
		} catch(err) {
			/* istanbul ignore next */
			this.broker.fatal("The 'bunyan' package is missing! Please install it with 'npm install bunyan --save' command!", err, true);
		}
	}

	/**
	 *
	 * @param {object} bindings
	 */
	getLogHandler(bindings) {
		let level = this.getLogLevel(bindings ? bindings.mod : null);
		if (!level)
			return null;

		const logger = _.isFunction(this.opts.createLogger) ? this.opts.createLogger(level, bindings) : this.bunyan.child({ level, ...bindings });

		return (type, args) => logger[type](...args);
	}

}

module.exports = BunyanLogger;
