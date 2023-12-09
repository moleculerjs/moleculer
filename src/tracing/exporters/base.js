"use strict";

/* eslint-disable no-unused-vars */

const _ = require("lodash");
const { isObject, safetyObject } = require("../../utils");

/**
 * Import types
 *
 * @typedef {import("./base")} BaseTraceExporterClass
 * @typedef {import("./base").BaseTraceExporterOptions} BaseTraceExporterOptions
 * @typedef {import("../tracer")} Tracer
 * @typedef {import("../span")} Span
 */

/**
 * Abstract Trace Exporter
 *
 * @class BaseTraceExporter
 * @implements {BaseTraceExporterClass}
 */
class BaseTraceExporter {
	/**
	 * Creates an instance of BaseTraceExporter.
	 * @param {BaseTraceExporterOptions?} opts
	 * @memberof BaseTraceExporter
	 */
	constructor(opts) {
		/** @type {BaseTraceExporterOptions} */
		this.opts = _.defaultsDeep(opts, {
			safetyTags: false
		});
		this.Promise = Promise; // default promise before logger is initialized
	}

	/**
	 * Initialize Trace Exporter.
	 *
	 * @param {Tracer} tracer
	 * @memberof BaseTraceExporter
	 */
	init(tracer) {
		this.tracer = tracer;
		this.broker = tracer.broker;
		this.Promise = this.broker.Promise;
		this.logger = this.opts.logger || this.tracer.logger;
	}

	/**
	 * Stop Trace exporter
	 */
	stop() {
		// Not implemented
	}

	/**
	 * Span is started.
	 *
	 * @param {Span} span
	 * @memberof BaseTraceExporter
	 */
	spanStarted(span) {
		// Not implemented
	}

	/**
	 * Span is finished.
	 *
	 * @param {Span} span
	 * @memberof BaseTraceExporter
	 */
	spanFinished(span) {
		// Not implemented
	}

	/**
	 * Flattening tags to one-level object.
	 * E.g.
	 *  **From:**
	 * 	```js
	 * 	{
	 * 		error: {
	 * 			name: "MoleculerError"
	 * 		}
	 * 	}
	 *  ```
	 *
	 * 	**To:**
	 * 	```js
	 *  {
	 * 		"error.name": "MoleculerError"
	 *  }
	 *  ```
	 *
	 * @param {Record<string, any>} obj
	 * @param {boolean} [convertToString=false]
	 * @param {string} [path=""]
	 * @returns {Record<string, any>}
	 * @memberof BaseTraceExporter
	 */
	flattenTags(obj, convertToString = false, path = "") {
		if (!obj) return null;

		if (this.opts.safetyTags) {
			obj = safetyObject(obj);
		}

		return Object.keys(obj).reduce((res, k) => {
			const o = obj[k];
			const pp = (path ? path + "." : "") + k;

			if (isObject(o)) Object.assign(res, this.flattenTags(o, convertToString, pp));
			else if (o !== undefined) {
				res[pp] = convertToString ? String(o) : o;
			}

			return res;
		}, {});
	}

	/**
	 * Convert Error to POJO.
	 *
	 * @param {Error|boolean} err
	 * @returns {Record<string, any>}
	 * @memberof BaseTraceExporter
	 */
	errorToObject(err) {
		if (!err || !isObject(err)) return null;

		return _.pick(err, this.tracer.opts.errorFields);
	}
}

module.exports = BaseTraceExporter;
