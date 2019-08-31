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
 * Console logger for Moleculer
 *
 * @class ConsoleLogger
 * @extends {BaseLogger}
 */
class ConsoleLogger extends BaseLogger {

	/**
	 * Creates an instance of ConsoleLogger.
	 * @param {Object} opts
	 * @memberof ConsoleLogger
	 */
	constructor(opts) {
		super(opts);

		this.opts = _.defaultsDeep(this.opts, {
			colors: true,
			moduleColors: false,
			formatter: null,
			objectPrinter: null,
			autoPadding: false
		});

		this.maxPrefixLength = 0;
	}

	init(logFactory) {
		super.init(logFactory);

		if (!this.opts.colors)
			kleur.enabled = false;

		this.objectPrinter = this.opts.objectPrinter ? this.opts.objectPrinter : o => util.inspect(o, { showHidden: false, depth: 2, colors: kleur.enabled, breakLength: Number.POSITIVE_INFINITY });

		// Generate colorful log level names
		this.levelColorStr = BaseLogger.LEVELS.reduce((a, level) => {
			a[level] = getColor(level)(_.padEnd(level.toUpperCase(), 5));
			return a;
		}, {});

		if (this.opts.colors && this.opts.moduleColors === true) {
			this.opts.moduleColors = ["cyan", "yellow", "green", "magenta", "red", "blue", "grey", /*"white,"*/
				"bold.cyan", "bold.yellow", "bold.green", "bold.magenta", "bold.red", "bold.blue", "bold.grey"];
		}
		this.colorCnt = 0;
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


			//return this.opts.moduleColors[this.colorCnt++ % this.opts.moduleColors.length];
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
		if (_.isFunction(formatter))
			return (type, args) => formatter(type, args, bindings);

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

		if (formatter == "simple") {
			// INFO  - Moleculer v0.14.0-beta3 is starting...
			return (type, args) => [this.levelColorStr[type], "-", ...printArgs(args)];
		} else if (formatter == "short") {
			// [08:42:12.973Z] INFO  BROKER: Moleculer v0.14.0-beta3 is starting...
			const prefixLen = 23 + bindings.mod.length;
			this.maxPrefixLength = Math.max(prefixLen, this.maxPrefixLength);
			return (type, args) => [kleur.grey(`[${new Date().toISOString().substr(11)}]`), this.levelColorStr[type], modColorName + this.padLeft(prefixLen) + kleur.grey(":"), ...printArgs(args)];
		} else {
			// [2019-08-31T08:40:53.481Z] INFO  bobcsi-pc-7100/BROKER: Moleculer v0.14.0-beta3 is starting...
			const prefixLen = 35 + bindings.nodeID.length + bindings.mod.length;
			this.maxPrefixLength = Math.max(prefixLen, this.maxPrefixLength);
			return (type, args) => [kleur.grey(`[${new Date().toISOString()}]`), this.levelColorStr[type], moduleColorName + this.padLeft(prefixLen) + kleur.grey(":"), ...printArgs(args)];
		}
	}

	/**
	 *
	 * @param {object} bindings
	 */
	getLogHandler(bindings) {
		const level = this.getLogLevel(bindings ? bindings.mod : null);
		if (!level)
			return null;

		const levelIdx = BaseLogger.LEVELS.indexOf(level);
		const formatter = this.getFormatter(bindings);

		return (type, args) => {
			const typeIdx = BaseLogger.LEVELS.indexOf(type);
			if (typeIdx > levelIdx) return;

			const pargs = formatter(type, args);
			switch(type) {
				case "fatal":
				case "error": return console.error(...pargs);
				case "warn": return console.warn(...pargs);
				default: return console.log(...pargs);
			}
		};
	}

}

module.exports = ConsoleLogger;
