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
const { makeDirs, match } = require("../utils");

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
			format: "json",
			eol: os.EOL,
			interval: 1 * 1000
		});

		this.queue = [];
		this.currentFilename = null;
		this.fs = null;
	}

	/**
	 * Initialize logger.
	 *
	 * @param {LogFactory} logFactory
	 */
	init(logFactory) {
		super.init(logFactory);

		this.logFolder = path.resolve(this.render(this.opts.folder, {
			nodeID: this.broker.nodeID,
			namespace: this.broker.namespace,
		}));

		makeDirs(this.logFolder);

		if (this.opts.interval > 0) {
			this.timer = setInterval(() => this.flush(), this.opts.interval);
			this.timer.unref();
		}
	}

	render(str, obj) {
		return str.replace(/\{\s?(\w+)\s?\}/g, (match, v) => obj[v] || "");
	}

	getFilename() {
		const now = new Date();
		//const date = `${now.getFullYear()}-${_.padStart(now.getMonth() + 1, 2, "0")}-${_.padStart(now.getDate(), 2, "0")}`;
		const date = now.toISOString().substr(0, 10).replace(/:/g, "_");

		return path.join(this.logFolder, this.render(this.opts.filename, {
			date,
			nodeID: this.broker.nodeID,
			namespace: this.broker.namespace,
		}));
	}

	/**
	 *
	 * @param {object} bindings
	 */
	getLogHandler(bindings) {
		let level = this.getLogLevel(bindings ? bindings.mod : null);
		if (!level)
			return null;

		const objectPrinter = o => util.inspect(o, { showHidden: false, depth: 2, colors: false, breakLength: Number.POSITIVE_INFINITY });
		const printArgs = args => {
			return args.map(p => {
				if (_.isObject(p) || _.isArray(p))
					return objectPrinter(p);
				return p;
			});
		};
		const levelIdx = BaseLogger.LEVELS.indexOf(level);

		return (type, args) => {
			const typeIdx = BaseLogger.LEVELS.indexOf(type);
			if (typeIdx > levelIdx) return;

			this.queue.push({ ts: Date.now(), level: type, msg: printArgs(args).join(" "), ...bindings });
			if (!this.opts.interval) this.flush();
		};
	}

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

			const buf = rows.map(row => this.renderRow(row)).join(this.opts.eol) + this.opts.eol;

			fs.appendFile(filename, buf, (err) => {
				if (err) {
					// eslint-disable-next-line no-console
					console.debug("Unable to write log file:", filename);
				}
			});
		}
	}

	renderRow(row) {
		if (this.opts.format == "json") {
			return JSON.stringify(row);
		} else {
			return this.render(this.opts.format, {
				...row,
				timestamp: new Date(row.ts).toISOString()
			});
		}
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
