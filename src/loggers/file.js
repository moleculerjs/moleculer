/*
 * moleculer
 * Copyright (c) 2023 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const FormattedLogger = require("./formatted");
const _ = require("lodash");

const fs = require("fs/promises");
const path = require("path");
const os = require("os");
const { makeDirs } = require("../utils");

/**
 * Import types
 *
 * @typedef {import("../logger-factory")} LoggerFactory
 * @typedef {import("../logger-factory").LoggerBindings} LoggerBindings
 * @typedef {import("./file").FileLoggerOptions} FileLoggerOptions
 * @typedef {import("./file")} FileLoggerClass
 */

/**
 * File logger for Moleculer
 *
 * @class FileLogger
 * @implements {FileLoggerClass}
 * @extends {FormattedLogger<FileLoggerOptions>}
 */
class FileLogger extends FormattedLogger {
	/**
	 * Creates an instance of FileLogger.
	 * @param {FileLoggerOptions} opts
	 * @memberof FileLogger
	 */
	constructor(opts) {
		super(opts);

		/** @type {FileLoggerOptions} */
		this.opts = _.defaultsDeep(this.opts, {
			folder: "./logs",
			filename: "moleculer-{date}.log",
			eol: os.EOL,
			interval: 1 * 1000
		});

		this.opts.colors = false;

		this.queue = [];
		this.timer = null;
		this.currentFilename = null;
		this.fs = null;
	}

	/**
	 * Initialize logger.
	 *
	 * @param {LoggerFactory} loggerFactory
	 */
	init(loggerFactory) {
		super.init(loggerFactory);

		this.logFolder = path.resolve(
			this.render(this.opts.folder, {
				nodeID: this.broker.nodeID,
				namespace: this.broker.namespace
			})
		);

		makeDirs(this.logFolder);

		if (this.opts.interval > 0) {
			this.timer = setInterval(() => this.flush(), this.opts.interval);
			this.timer.unref();
		}
	}

	/**
	 * Stopping logger
	 */
	stop() {
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = null;
		}

		return this.flush();
	}

	/**
	 * Get the current filename.
	 */
	getFilename() {
		const now = new Date();
		//const date = `${now.getFullYear()}-${_.padStart(now.getMonth() + 1, 2, "0")}-${_.padStart(now.getDate(), 2, "0")}`;
		const date = now.toISOString().substring(0, 10);

		return path.join(
			this.logFolder,
			this.render(this.opts.filename, {
				date,
				nodeID: this.broker.nodeID,
				namespace: this.broker.namespace
			})
		);
	}

	/**
	 * Get a log handler.
	 *
	 * @param {LoggerBindings} bindings
	 */
	getLogHandler(bindings) {
		const level = bindings ? this.getLogLevel(bindings.mod) : null;
		if (!level) return null;

		const levelIdx = FormattedLogger.LEVELS.indexOf(level);
		const formatter = this.getFormatter(bindings);

		return (type, args) => {
			const typeIdx = FormattedLogger.LEVELS.indexOf(type);
			if (typeIdx > levelIdx) return;

			const pargs = formatter(type, args);
			const msg = pargs.join(" ").replace(/\u001b\[.*?m/g, ""); // eslint-disable-line no-control-regex

			this.queue.push(msg);
			if (!this.opts.interval) this.flush();
		};
	}

	/**
	 * Flush queued log entries to the file.
	 */
	flush() {
		if (this.queue.length > 0) {
			// Check filename
			const filename = this.getFilename();
			/*if (filename != this.currentFilename) {
				this.changeFile(filename);
			}*/

			const rows = Array.from(this.queue);
			this.queue.length = 0;

			/*
			rows.forEach(row => this.writeRow(row));
			*/

			const buf = rows.join(this.opts.eol) + this.opts.eol;

			return fs.appendFile(filename, buf).catch(err => {
				/* istanbul ignore next */
				console.debug("Unable to write log file:", filename, err); // eslint-disable-line no-console
			});
		}

		return Promise.resolve();
	}
}

module.exports = FileLogger;
