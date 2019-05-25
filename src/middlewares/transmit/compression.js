/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const { defaultsDeep } = require("lodash");
const zlib = require("zlib");
const Promise = require("bluebird");

/**
 * This is a transmission compression middleware. It supports
 * the `deflate`, `deflateRaw` & `gzip` compression methods.
 *
 * @param {String} method
 */
module.exports = function CompressionMiddleware(opts) {
	opts = defaultsDeep(opts, { method: "deflate" });

	let compress, decompress;

	switch(opts.method) {
		case "deflate":
			compress = Promise.promisify(zlib.deflate);
			decompress = Promise.promisify(zlib.inflate);
			break;
		case "deflateRaw":
			compress = Promise.promisify(zlib.deflateRaw);
			decompress = Promise.promisify(zlib.inflateRaw);
			break;
		case "gzip":
			compress = Promise.promisify(zlib.gzip);
			decompress = Promise.promisify(zlib.gunzip);
			break;
		default:
			/* istanbul ignore next */
			throw new Error("Unknow compression method: " + opts.method);
	}

	let savingSent = 0;
	let savingReceived = 0;

	return {
		name: "Compression",

		created() {
			/* istanbul ignore next */
			this.logger.info(`The transmission is COMPRESSED by '${opts.method}'.`);
		},

		transporterSend(next) {
			return (topic, data, meta) => {
				return compress(data)
					.then(res => {
						savingSent += data.length - res.length;
						this.logger.debug(`Packet '${topic}' compressed. Saving: ${Number((1 - (res.length / data.length)) * 100).toFixed(0)}%`, data.length, res.length);
						return next(topic, res, meta);
					});
			};
		},

		transporterReceive(next) {
			return (cmd, data, s) => {
				return decompress(data)
					.then(res => {
						savingReceived += res.length - data.length;
						this.logger.debug(`Packet '${cmd}' decompressed. Saving: ${Number((1 - (res.length / data.length)) * 100).toFixed(0)}%`, data.length, res.length);
						return next(cmd, res, s);
					});
			};
		}
	};
};
