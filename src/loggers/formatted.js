/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

/* eslint-disable no-console */

"use strict";

const BaseLogger 	= require("./base");
const _ 			= require("lodash");
const kleur 		= require("kleur");
const util 			= require("util");
//const { match }		= require("../utils");


function getColor(type) {
	switch(type) {
		case "fatal": return kleur.red().inverse;
		case "error": return kleur.red;
		case "warn": return kleur.yellow;
		case "debug": return kleur.magenta;
		case "trace": return kleur.gray;
		default: return kleur.green;
	}
}

/**
 * Formatted abstract logger for Moleculer
 *
 * @class FormattedLogger
 * @extends {BaseLogger}
 */
class FormattedLogger extends BaseLogger {

	/**
	 * Creates an instance of FormattedLogger.
	 * @param {Object} opts
	 * @memberof FormattedLogger
	 */
	constructor(opts) {
		super(opts);

		this.opts = _.defaultsDeep(this.opts, {
			colors: true,
			moduleColors: false,
			formatter: "full",
			objectPrinter: null,
			autoPadding: false
		});

		this.maxPrefixLength = 0;
	}

	init(loggerFactory) {
		super.init(loggerFactory);

		if (!this.opts.colors)
			kleur.enabled = false;

		this.objectPrinter = this.opts.objectPrinter ? this.opts.objectPrinter : o => util.inspect(o, { showHidden: false, depth: 2, colors: kleur.enabled, breakLength: Number.POSITIVE_INFINITY });

		// Generate colorful log level names
		this.levelColorStr = BaseLogger.LEVELS.reduce((a, level) => {
			a[level] = getColor(level)(_.padEnd(level.toUpperCase(), 5));
			return a;
		}, {});

		if (this.opts.colors && this.opts.moduleColors === true) {
			this.opts.moduleColors = [
				"yellow", "bold.yellow",
				"cyan", "bold.cyan",
				"green", "bold.green",
				"magenta", "bold.magenta",
				"blue", "bold.blue",
				/*"red",*/
				/*"grey",*/
				/*"white,"*/
			];
		}
	}

	/**
	 * Get a color for the module name.
	 */
	getNextColor(mod) {
		if (this.opts.colors && Array.isArray(this.opts.moduleColors)) {
			// Credits: "visionmedia/debug" https://github.com/visionmedia/debug/blob/master/src/common.js#L45
			let hash = 0;

			for (let i = 0; i < mod.length; i++) {
				hash = ((hash << 5) - hash) + mod.charCodeAt(i);
				hash |= 0; // Convert to 32bit integer
			}

			return this.opts.moduleColors[Math.abs(hash) % this.opts.moduleColors.length];
		}

		return "grey";
	}

	padLeft(len) {
		if (this.opts.autoPadding)
			return " ".repeat(this.maxPrefixLength - len);

		return "";
	}

	/**
	 *
	 * @param {object} bindings
	 */
	getFormatter(bindings) {
		const formatter = this.opts.formatter;

		const mod = (bindings && bindings.mod) ? bindings.mod.toUpperCase() : "";
		const c = this.getNextColor(mod);
		const modColorName = c.split(".").reduce((a,b) => a[b] || a()[b], kleur)(mod);
		const moduleColorName = bindings ? kleur.grey(bindings.nodeID + "/") + modColorName : "";

		const printArgs = args => {
			return args.map(p => {
				if (_.isObject(p) || _.isArray(p))
					return this.objectPrinter(p);
				return p;
			});
		};

		if (_.isFunction(formatter)) {
			return (type, args) => formatter.call(this, type, args, bindings, { printArgs });

		} else if (formatter == "json") {
			// {"ts":1581243299731,"level":"info","msg":"Moleculer v0.14.0-rc2 is starting...","nodeID":"console","ns":"","mod":"broker"}
			kleur.enabled = false;
			return (type, args) => [JSON.stringify({ ts: Date.now(), level: type, msg: printArgs(args).join(" "), ...bindings })];
		} else if (formatter == "jsonext") {
			// {"time":"2020-02-09T10:44:35.285Z","level":"info","message":"Moleculer v0.14.0-rc2 is starting...","nodeID":"console","ns":"","mod":"broker"}
			kleur.enabled = false;
			return (type, args) => {
				const res = {
					time: new Date().toISOString(),
					level: type,
					message: "",
					...bindings
				};
				if (args.length > 0) {
					if (typeof(args[0]) == "object"/* && !(args[0] instanceof Error)*/) {
						Object.assign(res, args[0]);
						res.message = printArgs(args.slice(1)).join(" ");
					} else {
						res.message = printArgs(args).join(" ");
					}
				}
				return [JSON.stringify(res)];
			};
		} else if (formatter == "simple") {
			// INFO  - Moleculer v0.14.0-beta3 is starting...
			return (type, args) => [this.levelColorStr[type], "-", ...printArgs(args)];
		} else if (formatter == "short") {
			// [08:42:12.973Z] INFO  BROKER: Moleculer v0.14.0-beta3 is starting...
			const prefixLen = 23 + bindings.mod.length;
			this.maxPrefixLength = Math.max(prefixLen, this.maxPrefixLength);
			return (type, args) => [kleur.grey(`[${new Date().toISOString().substr(11)}]`), this.levelColorStr[type], modColorName + this.padLeft(prefixLen) + kleur.grey(":"), ...printArgs(args)];
		} else if (formatter == "full") {
			// [2019-08-31T08:40:53.481Z] INFO  bobcsi-pc-7100/BROKER: Moleculer v0.14.0-beta3 is starting...
			const prefixLen = 35 + bindings.nodeID.length + bindings.mod.length;
			this.maxPrefixLength = Math.max(prefixLen, this.maxPrefixLength);
			return (type, args) => [kleur.grey(`[${new Date().toISOString()}]`), this.levelColorStr[type], moduleColorName + this.padLeft(prefixLen) + kleur.grey(":"), ...printArgs(args)];
		} else {
			// [{timestamp}] {level} {nodeID}/{mod}: {msg}

			return (type, args) => {
				const timestamp = new Date().toISOString();
				return [this.render(formatter, {
					timestamp: kleur.grey(timestamp),
					time: kleur.grey(timestamp.substr(11)),

					level: this.levelColorStr[type],
					nodeID: kleur.grey(bindings.nodeID),
					mod: modColorName,
					msg: printArgs(args).join(" ")
				})];
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

}

module.exports = FormattedLogger;
