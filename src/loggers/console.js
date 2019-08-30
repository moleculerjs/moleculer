/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

/* eslint-disable no-console */

"use strict";

const BaseLogger = require("./base");
const _ = require("lodash");
const kleur = require("kleur");
const util 		= require("util");
const { match }	= require("../utils");

const COLORS = ["cyan", "yellow", "green", "magenta", "red", "blue", "white", "grey"/*,
	"bold.cyan", "bold.yellow", "bold.green", "bold.magenta", "bold.red", "bold.blue", "bold.white", "bold.grey"*/ ];

let colorCnt = 0;
function getNextColor() {
	return COLORS[colorCnt++ % COLORS.length];
}

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
			objectPrinter: null
		});

		if (!this.opts.colors)
			kleur.enabled = false;

		this.objectPrinter = this.opts.objectPrinter ? this.opts.objectPrinter : o => util.inspect(o, { showHidden: false, depth: 2, colors: kleur.enabled, breakLength: Number.POSITIVE_INFINITY });

		this.levelColorStr = BaseLogger.LEVELS.reduce((a, level) => {
			a[level] = getColor(level)(_.padEnd(level.toUpperCase(), 5));
			return a;
		}, {});

	}

	getFormatter(bindings) {
		const formatter = this.opts.formatter;
		if (_.isFunction(formatter))
			return (type, args) => formatter(type, args, bindings);

		const c = getNextColor();

		const mod = (bindings && bindings.mod) ? bindings.mod.toUpperCase() : "";
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
			return (type, args) => [this.levelColorStr[type], "-", ...printArgs(args)];
		} else if (formatter == "short") {
			return (type, args) => [kleur.grey(`[${new Date().toISOString().substr(11)}]`), this.levelColorStr[type], modColorName + kleur.grey(":"), ...printArgs(args)];
		} else {
			return (type, args) => [kleur.grey(`[${new Date().toISOString()}]`), this.levelColorStr[type], moduleColorName + kleur.grey(":"), ...printArgs(args)];
		}

	}

	getLogHandler(bindings) {
		const formatter = this.getFormatter(bindings);

		const mod = (bindings && bindings.mod) ? bindings.mod.toUpperCase() : "";

		const level = this.getLogLevel(mod);
		const levelIdx = level ? BaseLogger.LEVELS.indexOf(level) : -1;

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
