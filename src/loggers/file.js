/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const BaseLogger = require("./base");
const _ = require("lodash");

const fs = require("fs");
const path = require("path");
const os = require("os");
const util = require("util");
const { makeDirs } = require("../utils");

const appendFile = util.promisify(fs.appendFile);

/**
 * File logger for Moleculer
 *
 * @class FileLogger
 * @extends {BaseLogger}
 */
class FileLogger extends BaseLogger {

	/**
	 * Creates an instance of FileLogger.
	 * @param {Object} opts
	 * @memberof FileLogger
	 */
	constructor(opts) {
		super(opts);

		this.opts = _.defaultsDeep(this.opts, {
			folder: "./logs",
			filename: "moleculer-{date}.log",
			formatter: "json",
			objectPrinter: null,
			eol: os.EOL,
			interval: 1 * 1000
		});

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

		this.logFolder = path.resolve(this.render(this.opts.folder, {
			nodeID: this.broker.nodeID,
			namespace: this.broker.namespace,
		}));

		makeDirs(this.logFolder);

		this.objectPrinter = this.opts.objectPrinter ? this.opts.objectPrinter : o => util.inspect(o, { showHidden: false, depth: 2, colors: false, breakLength: Number.POSITIVE_INFINITY });

		this.formatter = this.getFormatter();

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
	 * Get formatter based on options
	 */
	getFormatter() {
		this.padLevels = BaseLogger.LEVELS.reduce((a, level) => {
			a[level] = _.padEnd(level.toUpperCase(), 5);
			return a;
		}, {});

		if (_.isFunction(this.opts.formatter))
			return this.opts.formatter;

		if (this.opts.formatter == "json")
			return row => JSON.stringify(row);

		if (_.isString(this.opts.formatter)) {
			let format = this.opts.formatter;
			if (this.opts.formatter == "full")
				format = "[{timestamp}] {level} {nodeID}/{mod}: {msg}";
			else if (this.opts.formatter == "simple")
				format = "{level} - {msg}";
			else if (this.opts.formatter == "short")
				format = "[{time}] {level} {mod}: {msg}";

			return row => {
				const timestamp = new Date(row.ts).toISOString();
				return this.render(format, {
					...row,
					timestamp,
					time: timestamp.substr(11),

					level: this.padLevels[row.level],
					mod: row && row.mod ? row.mod.toUpperCase() : ""
				});
			};
		}
	}

	/**
	 * Interpolate a text.
	 *
	 * @param {Strimg} str
	 * @param {Object} obj
	 * @returns {String}
	 */
	render(str, obj) {
		return str.replace(/\{\s?(\w+)\s?\}/g, (match, v) => obj[v] || "");
	}

	/**
	 * Get the current filename.
	 */
	getFilename() {
		const now = new Date();
		//const date = `${now.getFullYear()}-${_.padStart(now.getMonth() + 1, 2, "0")}-${_.padStart(now.getDate(), 2, "0")}`;
		const date = now.toISOString().substr(0, 10);

		return path.join(this.logFolder, this.render(this.opts.filename, {
			date,
			nodeID: this.broker.nodeID,
			namespace: this.broker.namespace,
		}));
	}

	/**
	 * Generate a new log handler.
	 *
	 * @param {object} bindings
	 */
	getLogHandler(bindings) {
		let level = bindings ? this.getLogLevel(bindings.mod) : null;
		if (!level)
			return null;

		const levelIdx = BaseLogger.LEVELS.indexOf(level);
		const printArgs = args => args.map(p => (_.isObject(p) || _.isArray(p)) ? this.objectPrinter(p) : p);

		return (type, args) => {
			const typeIdx = BaseLogger.LEVELS.indexOf(type);
			if (typeIdx > levelIdx) return;

			const msg = printArgs(args).join(" ").replace(/\u001b\[.*?m/g, ""); // eslint-disable-line no-control-regex
			this.queue.push({ ts: Date.now(), level: type, msg, ...bindings });
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

			const buf = rows.map(row => this.formatter(row)).join(this.opts.eol) + this.opts.eol;

			return appendFile(filename, buf).catch((err) => {
				/* istanbul ignore next */
				console.debug("Unable to write log file:", filename, err); // eslint-disable-line no-console
			});
		}

		return Promise.resolve();
	}

	/*writeRow(row) {
		this.fs.write(this.renderRow(row) + this.opts.eol);
	}

	changeFile(newFilename) {
		if (this.fs) {
			this.fs.close();
		}

		// Flags: https://nodejs.org/dist/latest-v10.x/docs/api/fs.html#fs_file_system_flags
		this.fs = fs.createWriteStream(newFilename, { flags: "a" });
		this.currentFilename = newFilename;

		this.fs.on("error", err => console.error(err));
		this.fs.on("close", () => console.warn("File closed"));
		this.fs.on("finish", () => console.warn("File finished"));
	}
	*/
}

module.exports = FileLogger;
