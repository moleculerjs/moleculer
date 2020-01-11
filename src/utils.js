/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ 		= require("lodash");
const kleur		= require("kleur");
const os 	 	= require("os");
const path 	 	= require("path");
const fs 	 	= require("fs");
const ExtendableError = require("es6-error");

const lut = [];
for (let i=0; i<256; i++) { lut[i] = (i<16?"0":"")+(i).toString(16); }

const RegexCache = new Map();

const deprecateList = [];

const byteMultipliers = {
	b:  1,
	kb: 1 << 10,
	mb: 1 << 20,
	gb: 1 << 30,
	tb: Math.pow(1024, 4),
	pb: Math.pow(1024, 5),
};
// eslint-disable-next-line security/detect-unsafe-regex
const parseByteStringRe = /^((-|\+)?(\d+(?:\.\d+)?)) *(kb|mb|gb|tb|pb)$/i;

class TimeoutError extends ExtendableError {}

function circularReplacer() {
	const seen = new WeakSet();
	return function(key, value) {
		if (typeof value === "object" && value !== null) {
			if (seen.has(value)) {
				//delete this[key];
				return;
			}
			seen.add(value);
		}
		return value;
	};
}

const units = ["h", "m", "s", "ms", "μs", "ns"];
const divisors = [60 * 60 * 1000, 60 * 1000, 1000, 1, 1e-3, 1e-6];

const utils = {

	humanize(milli) {
		if (milli == null) return "?";

		for (let i = 0; i < divisors.length; i++) {
			const val = milli / divisors[i];
			if (val >= 1.0)
				return "" + Math.floor(val) + units[i];
		}

		return "now";
	},

	// Fast UUID generator: e7 https://jsperf.com/uuid-generator-opt/18
	generateToken() {
		const d0 = Math.random()*0xffffffff|0;
		const d1 = Math.random()*0xffffffff|0;
		const d2 = Math.random()*0xffffffff|0;
		const d3 = Math.random()*0xffffffff|0;
		return lut[d0&0xff]+lut[d0>>8&0xff]+lut[d0>>16&0xff]+lut[d0>>24&0xff]+"-"+
			lut[d1&0xff]+lut[d1>>8&0xff]+"-"+lut[d1>>16&0x0f|0x40]+lut[d1>>24&0xff]+"-"+
			lut[d2&0x3f|0x80]+lut[d2>>8&0xff]+"-"+lut[d2>>16&0xff]+lut[d2>>24&0xff]+
			lut[d3&0xff]+lut[d3>>8&0xff]+lut[d3>>16&0xff]+lut[d3>>24&0xff];
	},

	/**
	 * Get default NodeID (computerName)
	 *
	 * @returns
	 */
	getNodeID() {
		return os.hostname().toLowerCase() + "-" + process.pid;
	},

	/**
	 * Get list of local IPs
	 *
	 * @returns
	 */
	getIpList() {
		const list = [];
		const interfaces = os.networkInterfaces();
		for (let iface in interfaces) {
			for (let i in interfaces[iface]) {
				const f = interfaces[iface][i];
				if (f.family === "IPv4" && !f.internal) {
					list.push(f.address);
					break;
				}
			}
		}
		return list;
	},

	/**
	 * Check the param is a Promise instance
	 *
	 * @param {any} p
	 * @returns
	 */
	isPromise(p) {
		return (p != null && typeof p.then === "function");
	},

	/**
	 * Polyfill a Promise library with missing Bluebird features.
	 *
	 * NOT USED & NOT TESTED YET !!!
	 *
	 * @param {PromiseClass} P
	 */
	polyfillPromise(P) {
		if (!_.isFunction(P.method)) {
			// Based on https://github.com/petkaantonov/bluebird/blob/master/src/method.js#L8
			P.method = function(fn) {
				return function() {
					try {
						const val = fn.apply(this, arguments);
						return P.resolve(val);
					} catch (err) {
						return P.reject(err);
					}
				};
			};
		}

		if (!_.isFunction(P.delay)) {
			// Based on https://github.com/petkaantonov/bluebird/blob/master/src/timers.js#L15
			P.delay = function(ms) {
				return new P(resolve => setTimeout(resolve, +ms));
			};
			P.prototype.delay = function(ms) {
				return this.then(res => P.delay(ms).then(() => res));
				//return this.then(res => new P(resolve => setTimeout(() => resolve(res), +ms)));
			};
		}

		if (!_.isFunction(P.prototype.timeout)) {
			P.TimeoutError = TimeoutError;

			P.prototype.timeout = function(ms, message) {
				let timer;
				const timeout = new P((resolve, reject) => {
					timer = setTimeout(() => reject(new P.TimeoutError(message)), +ms);
				});

				return P.race([
					timeout,
					this
						.then(value => {
							clearTimeout(timer);
							return value;
						})
						.catch(err => {
							clearTimeout(timer);
							throw err;
						})
				]);
			};
		}

		if (!_.isFunction(P.mapSeries)) {

			P.mapSeries = function(arr, fn) {
				const promFn = Promise.method(fn);
				const res = [];

				return arr.reduce((p, item, i) => {
					return p.then(r => {
						res[i] = r;
						return promFn(item, i);
					});
				}, P.resolve()).then(r => {
					res[arr.length] = r;
					return res.slice(1);
				});
			};
		}
	},

	/**
	 * Clear `require` cache. Used for service hot reloading
	 *
	 * @param {String} filename
	 */
	clearRequireCache(filename) {
		/* istanbul ignore next */
		Object.keys(require.cache).forEach(function(key) {
			if (key == filename) {
				delete require.cache[key];
			}
		});
	},

	/**
	 * String matcher to handle dot-separated event/action names.
	 *
	 * @param {String} text
	 * @param {String} pattern
	 * @returns {Boolean}
	 */
	match(text, pattern) {
		// Simple patterns
		if (pattern.indexOf("?") == -1) {

			// Exact match (eg. "prefix.event")
			const firstStarPosition = pattern.indexOf("*");
			if (firstStarPosition == -1) {
				return pattern === text;
			}

			// Eg. "prefix**"
			const len = pattern.length;
			if (len > 2 && pattern.endsWith("**") && firstStarPosition > len - 3) {
				pattern = pattern.substring(0, len - 2);
				return text.startsWith(pattern);
			}

			// Eg. "prefix*"
			if (len > 1 && pattern.endsWith("*") && firstStarPosition > len - 2) {
				pattern = pattern.substring(0, len - 1);
				if (text.startsWith(pattern)) {
					return text.indexOf(".", len) == -1;
				}
				return false;
			}

			// Accept simple text, without point character (*)
			if (len == 1 && firstStarPosition == 0) {
				return text.indexOf(".") == -1;
			}

			// Accept all inputs (**)
			if (len == 2 && firstStarPosition == 0 && pattern.lastIndexOf("*") == 1) {
				return true;
			}
		}

		// Regex (eg. "prefix.ab?cd.*.foo")
		const origPattern = pattern;
		let regex = RegexCache.get(origPattern);
		if (regex == null) {
			if (pattern.startsWith("$")) {
				pattern = "\\" + pattern;
			}
			pattern = pattern.replace(/\?/g, ".");
			pattern = pattern.replace(/\*\*/g, "§§§");
			pattern = pattern.replace(/\*/g, "[^\\.]*");
			pattern = pattern.replace(/§§§/g, ".*");

			pattern = "^" + pattern + "$";

			// eslint-disable-next-line security/detect-non-literal-regexp
			regex = new RegExp(pattern, "");
			RegexCache.set(origPattern, regex);
		}
		return regex.test(text);
	},

	/**
	 * Deprecate a method or property
	 *
	 * @param {Object|Function|String} prop
	 * @param {String} msg
	 */
	deprecate(prop, msg) {
		if (arguments.length == 1)
			msg = prop;

		if (deprecateList.indexOf(prop) === -1) {
			// eslint-disable-next-line no-console
			console.warn(kleur.yellow().bold(`DeprecationWarning: ${msg}`));
			deprecateList.push(prop);
		}
	},

	/**
	 * Remove circular references & Functions from the JS object
	 *
	 * @param {Object|Array} obj
	 * @returns {Object|Array}
	 */
	safetyObject(obj) {
		return JSON.parse(JSON.stringify(obj, circularReplacer()));
	},

	/**
	 * Sets a variable on an object based on its dot path.
	 *
	 * @param {Object} obj
	 * @param {String} path
	 * @param {*} value
	 * @returns {Object}
	 */
	dotSet(obj, path, value) {
		const parts = path.split(".");
		const part = parts.shift();
		if (parts.length > 0) {
			if (!(part in obj)) {
				obj[part] = {};
			} else {
				if (typeof obj[part] !== "object") {
					throw new Error("Value already set and it's not an object");
				}
			}
			obj[part] = utils.dotSet(obj[part], parts.join("."), value);
			return obj;
		}
		obj[path] = value;
		return obj;
	},

	/**
	 * Make directories recursively
	 * @param {String} p - directory path
	 */
	makeDirs(p) {
		p.split(path.sep)
			.reduce((prevPath, folder) => {
				const currentPath = path.join(prevPath, folder, path.sep);
				if (!fs.existsSync(currentPath)) {
					fs.mkdirSync(currentPath);
				}
				return currentPath;
			}, "");
	},

	/**
	 * Parse a byte string to number of bytes. E.g "1kb" -> 1024
	 * Credits: https://github.com/visionmedia/bytes.js
	 *
	 * @param {String} v
	 * @returns {Number}
	 */
	parseByteString(v) {
		if (typeof v === "number" && !isNaN(v)) {
			return v;
		}

		if (typeof v !== "string") {
			return null;
		}

		// Test if the string passed is valid
		let results = parseByteStringRe.exec(v);
		let floatValue;
		let unit = "b";

		if (!results) {
			// Nothing could be extracted from the given string
			floatValue = parseInt(v, 10);
			if (Number.isNaN(floatValue))
				return null;

			unit = "b";
		} else {
			// Retrieve the value and the unit
			floatValue = parseFloat(results[1]);
			unit = results[4].toLowerCase();
		}

		return Math.floor(byteMultipliers[unit] * floatValue);
	}
};

module.exports = utils;
