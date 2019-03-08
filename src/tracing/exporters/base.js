"use strict";

const _ 					= require("lodash");

/**
 * Abstract Trace Exporter
 *
 * @class BaseTraceExporter
 */
class BaseTraceExporter {

	/**
	 * Creates an instance of BaseTraceExporter.
	 * @param {Object?} opts
	 * @memberof BaseTraceExporter
	 */
	constructor(opts) {
		this.opts = opts || {};
	}

	/**
	 * Initialize Trace Exporter.
	 *
	 * @param {Tracer} tracer
	 * @memberof BaseTraceExporter
	 */
	init(tracer) {
		this.tracer = tracer;
		this.logger = this.opts.logger || this.tracer.logger;
	}

	/**
	 * Span is started.
	 *
	 * @param {Span} span
	 * @memberof BaseTraceExporter
	 */
	startSpan(/*span*/) {
		// Not implemented
	}

	/**
	 * Span is finished.
	 *
	 * @param {Span} span
	 * @memberof BaseTraceExporter
	 */
	finishSpan(/*span*/) {
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
	 * @param {Object} obj
	 * @param {boolean} [convertToString=false]
	 * @param {string} [path=""]
	 * @returns {Object}
	 * @memberof BaseTraceExporter
	 */
	flattenTags(obj, convertToString = false, path = "") {
		return Object.keys(obj).reduce((res, k) => {
			const o = obj[k];
			const pp = (path ? path + "." : "") + k;

			if (_.isObject(o))
				Object.assign(res, this.flattenTags(o, convertToString, pp));
			else {
				res[pp] = convertToString ? String(o) : o;
			}

			return res;
		}, {});
	}

}

module.exports = BaseTraceExporter;
