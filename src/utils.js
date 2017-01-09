/*
 * ice-services
 * Copyright (c) 2017 Norbert Mereg (https://github.com/icebob/ice-services)
 * MIT Licensed
 */

"use strict";

/*let TokenGenerator = require("uuid-token-generator");
let tokgen256 = new TokenGenerator(256, TokenGenerator.BASE62);
let tokgen128 = new TokenGenerator(128, TokenGenerator.BASE62);
*/
const uuidV4 = require("uuid/v4");
const os 	 = require("os");

let utils = {

	generateToken() {
		// return tokgen128.generate();
		return uuidV4();
	},
/*
	generateToken256() {
		//return tokgen256.generate();
		return uuidV4();
		// return "1"; 
	}
	*/

	/**
	 * Get default NodeID (computerName)
	 * 
	 * @returns
	 */
	getNodeID() {
		return os.hostname().toLowerCase();
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
		return (p && typeof p.then === "function");
	},

	/**
	 * Convert string to Javascript object. (Handle exceptions)
	 * If string is empty or null or invalid JSON, returns with `undefined`
	 * 
	 * @param {any} str
	 * @returns
	 */
	string2Json(str) {
		try {
			if (str) {
				return JSON.parse(str);				
			}
		} catch (err) {
			/* istanbul ignore next */
			console.warn(err);
		}
	},

	/**
	 * Convert a JS object to string (stringify)
	 * If param is null or undefined, returns with empty string (handle exception)
	 * 
	 * @param {any} json
	 * @returns
	 */
	json2String(json) {
		try {
			if (json != null) {
				return JSON.stringify(json);
			}
		} catch (err) {
			/* istanbul ignore next */
			console.warn(err);
		}
		return "";
	}
};

module.exports = utils;