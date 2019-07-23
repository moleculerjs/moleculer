/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const Promise 	= require("bluebird");
const kleur		= require("kleur");
const os 	 	= require("os");

const lut = [];
for (let i=0; i<256; i++) { lut[i] = (i<16?"0":"")+(i).toString(16); }

const RegexCache = new Map();

const deprecateList = [];

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

const utils = {

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
	 * Delay for Promises
	 *
	 * @param {any} ms
	 * @returns
	 */
	delay(ms) {
		/* istanbul ignore next */
		return () => new Promise((resolve) => setTimeout(resolve, ms));
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
		let regex = RegexCache.get(pattern);
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
			regex = new RegExp(pattern, "g");
			RegexCache.set(pattern, regex);
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
	}

};

module.exports = utils;
