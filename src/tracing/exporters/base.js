"use strict";

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
}

module.exports = BaseTraceExporter;
