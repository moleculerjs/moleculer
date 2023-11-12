/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const kleur = require("kleur");
const os = require("os");
const path = require("path");
const fs = require("fs");
const { ExtendableError } = require("./errors");

const lut = [];
for (let i = 0; i < 256; i++) {
	lut[i] = (i < 16 ? "0" : "") + i.toString(16);
}

const RegexCache = new Map();

const deprecateList = [];

const byteMultipliers = {
	b: 1,
	kb: 1 << 10,
	mb: 1 << 20,
	gb: 1 << 30,
	tb: Math.pow(1024, 4),
	pb: Math.pow(1024, 5)
};
// eslint-disable-next-line security/detect-unsafe-regex
const parseByteStringRe = /^((-|\+)?(\d+(?:\.\d+)?)) *(kb|mb|gb|tb|pb)$/i;

class TimeoutError extends ExtendableError {}

/**
 * Circular replacing of unsafe properties in object
 *
 * @param {Object=} options List of options to change circularReplacer behaviour
 * @param {number=} options.maxSafeObjectSize Maximum size of objects for safe object converting
 * @return {function(...[*]=)}
 */
function circularReplacer(options = { maxSafeObjectSize: Infinity }) {
	const seen = new WeakSet();
	return function (key, value) {
		if (typeof value === "object" && value !== null) {
			const objectType = (value.constructor && value.constructor.name) || typeof value;

			if (
				options.maxSafeObjectSize &&
				"length" in value &&
				value.length > options.maxSafeObjectSize
			) {
				return `[${objectType} ${value.length}]`;
			}

			if (
				options.maxSafeObjectSize &&
				"size" in value &&
				value.size > options.maxSafeObjectSize
			) {
				return `[${objectType} ${value.size}]`;
			}

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
	isFunction(fn) {
		return typeof fn === "function";
	},

	isString(s) {
		return typeof s === "string" || s instanceof String;
	},

	isObject(o) {
		return o !== null && typeof o === "object" && !(o instanceof String);
	},

	isPlainObject(o) {
		return o != null
			? Object.getPrototypeOf(o) === Object.prototype || Object.getPrototypeOf(o) === null
			: false;
	},

	isDate(d) {
		return d instanceof Date && !Number.isNaN(d.getTime());
	},

	flatten(arr) {
		return Array.prototype.reduce.call(arr, (a, b) => a.concat(b), []);
	},

	humanize(milli) {
		if (milli == null) return "?";

		for (let i = 0; i < divisors.length; i++) {
			const val = milli / divisors[i];
			if (val >= 1.0) return "" + Math.floor(val) + units[i];
		}

		return "now";
	},

	// Fast UUID generator: e7 https://jsperf.com/uuid-generator-opt/18
	generateToken() {
		const d0 = (Math.random() * 0xffffffff) | 0;
		const d1 = (Math.random() * 0xffffffff) | 0;
		const d2 = (Math.random() * 0xffffffff) | 0;
		const d3 = (Math.random() * 0xffffffff) | 0;
		return (
			lut[d0 & 0xff] +
			lut[(d0 >> 8) & 0xff] +
			lut[(d0 >> 16) & 0xff] +
			lut[(d0 >> 24) & 0xff] +
			"-" +
			lut[d1 & 0xff] +
			lut[(d1 >> 8) & 0xff] +
			"-" +
			lut[((d1 >> 16) & 0x0f) | 0x40] +
			lut[(d1 >> 24) & 0xff] +
			"-" +
			lut[(d2 & 0x3f) | 0x80] +
			lut[(d2 >> 8) & 0xff] +
			"-" +
			lut[(d2 >> 16) & 0xff] +
			lut[(d2 >> 24) & 0xff] +
			lut[d3 & 0xff] +
			lut[(d3 >> 8) & 0xff] +
			lut[(d3 >> 16) & 0xff] +
			lut[(d3 >> 24) & 0xff]
		);
	},

	removeFromArray(arr, item) {
		if (!arr || arr.length == 0) return arr;
		const idx = arr.indexOf(item);
		if (idx !== -1) arr.splice(idx, 1);

		return arr;
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
		const ilist = [];
		const interfaces = os.networkInterfaces();
		for (let iface in interfaces) {
			for (let i in interfaces[iface]) {
				const f = interfaces[iface][i];
				if (f.family === "IPv4") {
					if (f.internal) {
						ilist.push(f.address);
						break;
					} else {
						list.push(f.address);
						break;
					}
				}
			}
		}
		return list.length > 0 ? list : ilist;
	},

	/**
	 * Check the param is a Promise instance
	 *
	 * @param {any} p
	 * @returns
	 */
	isPromise(p) {
		return p != null && typeof p.then === "function";
	},

	/**
	 * Polyfill a Promise library with missing Bluebird features.
	 *
	 *
	 * @param {PromiseClass} P
	 */
	polyfillPromise(P) {
		if (!utils.isFunction(P.method)) {
			// Based on https://github.com/petkaantonov/bluebird/blob/master/src/method.js#L8
			P.method = function (fn) {
				return function () {
					try {
						const val = fn.apply(this, arguments);
						return P.resolve(val);
					} catch (err) {
						return P.reject(err);
					}
				};
			};
		}

		if (!utils.isFunction(P.delay)) {
			// Based on https://github.com/petkaantonov/bluebird/blob/master/src/timers.js#L15
			P.delay = function (ms) {
				return new P(resolve => setTimeout(resolve, +ms));
			};
			P.prototype.delay = function (ms) {
				return this.then(res => P.delay(ms).then(() => res));
				//return this.then(res => new P(resolve => setTimeout(() => resolve(res), +ms)));
			};
		}

		if (!utils.isFunction(P.prototype.timeout)) {
			P.TimeoutError = TimeoutError;

			P.prototype.timeout = function (ms, message) {
				let timer;
				const timeout = new P((resolve, reject) => {
					timer = setTimeout(() => reject(new P.TimeoutError(message)), +ms);
				});

				return P.race([timeout, this])
					.then(value => {
						clearTimeout(timer);
						return value;
					})
					.catch(err => {
						clearTimeout(timer);
						throw err;
					});
			};
		}

		if (!utils.isFunction(P.mapSeries)) {
			P.mapSeries = function (arr, fn) {
				const promFn = Promise.method(fn);
				const res = [];

				return arr
					.reduce((p, item, i) => {
						return p.then(r => {
							res[i] = r;
							return promFn(item, i);
						});
					}, P.resolve())
					.then(r => {
						res[arr.length] = r;
						return res.slice(1);
					});
			};
		}
	},

	/**
	 * Promise control
	 * if you'd always like to know the result of each promise
	 *
	 * @param {Array} promises
	 * @param {Boolean} settled set true for result of each promise with reject
	 * @param {Object} promise
	 * @return {Promise<{[p: string]: PromiseSettledResult<*>}>|Promise<unknown[]>}
	 */
	promiseAllControl(promises, settled = false, promise = Promise) {
		return settled ? promise.allSettled(promises) : promise.all(promises);
	},

	/**
	 * Clear `require` cache. Used for service hot reloading
	 *
	 * @param {String} filename
	 */
	clearRequireCache(filename) {
		/* istanbul ignore next */
		Object.keys(require.cache).forEach(function (key) {
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
		if (arguments.length == 1) msg = prop;

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
	 * @param {Object=} options List of options to change circularReplacer behaviour
	 * @param {number=} options.maxSafeObjectSize List of options to change circularReplacer behaviour
	 * @returns {Object|Array}
	 */
	safetyObject(obj, options) {
		return JSON.parse(JSON.stringify(obj, circularReplacer(options)));
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
			if (!Object.prototype.hasOwnProperty.call(obj, part)) {
				obj[part] = {};
			} else if (obj[part] == null) {
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
		p.split(path.sep).reduce((prevPath, folder) => {
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
			if (Number.isNaN(floatValue)) return null;

			unit = "b";
		} else {
			// Retrieve the value and the unit
			floatValue = parseFloat(results[1]);
			unit = results[4].toLowerCase();
		}

		return Math.floor(byteMultipliers[unit] * floatValue);
	},

	/**
	 * Get the name of constructor of an object.
	 *
	 * @param {Object} obj
	 * @returns {String}
	 */
	getConstructorName(obj) {
		if (obj == null) return undefined;

		let target = obj.prototype;
		if (target && target.constructor && target.constructor.name) {
			return target.constructor.name;
		}
		if (obj.constructor && obj.constructor.name) {
			return obj.constructor.name;
		}
		return undefined;
	},

	/**
	 * Check whether the instance is an instance of the given class.
	 *
	 * @param {Object} instance
	 * @param {Object} baseClass
	 * @returns {Boolean}
	 */
	isInheritedClass(instance, baseClass) {
		const baseClassName = module.exports.getConstructorName(baseClass);
		let proto = instance;
		while ((proto = Object.getPrototypeOf(proto))) {
			const protoName = module.exports.getConstructorName(proto);
			if (baseClassName == protoName) return true;
		}

		return false;
	},

	/**
	 * Detects the argument names of a function.
	 * Credits: https://github.com/sindresorhus/fn-args
	 *
	 * @param {Function} function_
	 * @returns {Array<String>}
	 */
	functionArguments(function_) {
		if (typeof function_ !== "function") {
			throw new TypeError("Expected a function");
		}

		const commentRegex = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/gm;
		const quotes = ["`", '"', "'"];

		const functionSource = function_.toString().replace(commentRegex, ""); // Function with no comments

		let functionWithNoDefaults = "";
		let depth = 0; // () [] {}
		let index = 0;

		// To remove default values we can not use regexp because finite automaton can not handle such
		// things as (potential) infinity-nested blocks (), [], {}

		// Remove default values
		for (; index < functionSource.length && functionSource.charAt(index) !== ")"; index += 1) {
			// Exiting if an arrow occurs. Needed when arrow function without '()'.
			if (functionSource.startsWith("=>", index)) {
				functionWithNoDefaults = functionSource;
				index = functionSource.length;
				break;
			}

			// If we found a default value - skip it
			if (functionSource.charAt(index) === "=") {
				for (
					;
					index < functionSource.length &&
					((functionSource.charAt(index) !== "," &&
						functionSource.charAt(index) !== ")") ||
						depth !== 0);
					index += 1
				) {
					// Skip all quotes
					let wasQuote = false;

					for (const quote of quotes) {
						if (functionSource.charAt(index) === quote) {
							index += 1;

							for (
								;
								index < functionSource.length &&
								functionSource.charAt(index) !== quote;

							) {
								index += 1;
							}

							wasQuote = true;
							break;
						}
					}

					// If any quote type was skipped, start the cycle again
					if (wasQuote) {
						continue;
					}

					switch (
						functionSource.charAt(index) // Keeps correct depths of all types of parenthesises
					) {
						case "(":
						case "[":
						case "{":
							depth += 1;
							break;
						case ")":
						case "]":
						case "}":
							depth -= 1;
							break;
						default:
					}
				}

				if (functionSource.charAt(index) === ",") {
					functionWithNoDefaults += ",";
				}

				if (functionSource.charAt(index) === ")") {
					// Quits from the cycle immediately
					functionWithNoDefaults += ")";
					break;
				}
			} else {
				functionWithNoDefaults += functionSource.charAt(index);
			}
		}

		if (index < functionSource.length && functionSource.charAt(index) === ")") {
			functionWithNoDefaults += ")";
		}

		// The first part matches parens-less arrow functions
		// The second part matches the rest
		const regexFnArguments = /^(?:async)?([^=()]+)=|\(([^)]+)\)/;

		const match = regexFnArguments.exec(functionWithNoDefaults);

		return match
			? (match[1] || match[2])
					.split(",")
					.map(x => x.trim())
					.filter(Boolean)
			: [];
	},

	/**
	 * Creates a duplicate-free version of an array
	 *
	 * @param {Array<String|Number>} arr
	 * @returns {Array<String|Number>}
	 */
	uniq(arr) {
		return [...new Set(arr)];
	},

	/**
	 * Produces a random floating number between the inclusive lower and upper bounds.
	 *
	 * @param {Number} a
	 * @param {Number} b
	 * @returns {Number}
	 */
	random(a = 1, b = 0) {
		const lower = Math.min(a, b);
		const upper = Math.max(a, b);

		return lower + Math.random() * (upper - lower);
	},

	/**
	 * Produces a random integer number between the inclusive lower and upper bounds.
	 *
	 * @param {Number} a
	 * @param {Number} b
	 * @returns {Number}
	 */
	randomInt(a = 1, b = 0) {
		const lower = Math.ceil(Math.min(a, b));
		const upper = Math.floor(Math.max(a, b));

		return Math.floor(lower + Math.random() * (upper - lower + 1));
	}
};

module.exports = utils;
