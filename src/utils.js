/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const Promise 	= require("bluebird");
const os 	 	= require("os");
const _			= require("lodash");

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
		return os.hostname().toLowerCase();// + "-" + process.pid;
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
	 * Merge two Service schema
	 *
	 * @param {Object} schema
	 * @param {Object} mods
	 * @returns
	 */
	mergeSchemas(schema, mods) {
		function updateProp(propName, target, source) {
			if (source[propName] !== undefined)
				target[propName] = source[propName];
		}

		const res = _.cloneDeep(schema);

		Object.keys(mods).forEach(key => {
			if (["settings"].indexOf(key) !== -1) {
				res[key] = _.defaultsDeep(mods[key], res[key]);
			} else if (["actions", "methods"].indexOf(key) !== -1) {
				res[key] = _.assign(res[key], mods[key]);
			} else if (["events"].indexOf(key) !== -1) {
				if (res[key] == null)
					res[key] = {};

				Object.keys(mods[key]).forEach(k => {
					res[key][k] = _.compact(_.flatten([res[key][k], mods[key][k]]));
				});
			} else if (["created", "started", "stopped"].indexOf(key) !== -1) {
				// Concat lifecycle event handlers
				res[key] = _.compact(_.flatten([res[key], mods[key]]));
			} else if (["mixins"].indexOf(key) !== -1) {
				// Concat mixins
				res[key] = _.compact(_.flatten([mods[key], res[key]]));
			} else
				updateProp(key, res, mods);
		});

		return res;
	},

	clearRequireCache(filename) {
		Object.keys(require.cache).forEach(function(key) {
			if (key == filename) {
				delete require.cache[key];
			}
		});
	}

};

module.exports = utils;
