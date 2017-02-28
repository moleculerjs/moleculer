/*
 * moleculer
 * Copyright (c) 2017 Icebob (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const Promise 	= require("bluebird");
const os 	 	= require("os");

const lut = []; 
for (let i=0; i<256; i++) { lut[i] = (i<16?"0":"")+(i).toString(16); }

let utils = {

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
		return (p != null && typeof p.then === "function");
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
		return null;
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