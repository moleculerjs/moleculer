"use strict";

const _ 					= require("lodash");
const fetch 				= require("node-fetch");
const BaseTraceExporter 	= require("./base");
const { isFunction } 		= require("../../utils");

/**
 * Trace Exporter for Zipkin.
 *
 * API v2: https://zipkin.io/zipkin-api/#/
 * API v1: https://zipkin.io/pages/data_model.html
 *
 * Running Zipkin in Docker:
 *
 * 	 docker run -d -p 9411:9411 --name=zipkin openzipkin/zipkin
 *
 * @class ZipkinTraceExporter
 */
class ZipkinTraceExporter extends BaseTraceExporter {

	/**
	 * Creates an instance of ZipkinTraceExporter.
	 * @param {Object?} opts
	 * @memberof ZipkinTraceExporter
	 */
	constructor(opts) {
		super(opts);

		this.opts = _.defaultsDeep(this.opts, {
			/** @type {String} Base URL for Zipkin server. */
			baseURL: process.env.ZIPKIN_URL || "http://localhost:9411",

			/** @type {String} Zipkin REST API version. */
			//version: "v2",

			/** @type {Number} Batch send time interval in seconds. */
			interval: 5,

			/** @type {Object} Additional payload options. */
			payloadOptions: {

				/** @type {Boolean} Set `debug` property in v2 payload. */
				debug: false,

				/** @type {Boolean} Set `shared` property in v2 payload. */
				shared: false
			},

			/** @type {Object?} Default span tags */
			defaultTags: null
		});

		this.queue = [];
	}

	/**
	 * Initialize Trace Exporter.
	 *
	 * @param {Tracer} tracer
	 * @memberof ZipkinTraceExporter
	 */
	init(tracer) {
		super.init(tracer);

		fetch.Promise = this.broker.Promise;

		if (this.opts.interval > 0) {
			this.timer = setInterval(() => this.flush(), this.opts.interval * 1000);
			this.timer.unref();
		}

		this.defaultTags = isFunction(this.opts.defaultTags) ? this.opts.defaultTags.call(this, tracer) : this.opts.defaultTags;
		if (this.defaultTags) {
			this.defaultTags = this.flattenTags(this.defaultTags, true);
		}
	}

	/**
	 * Stop Trace exporter
	 */
	stop() {
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = null;
		}
		return this.broker.Promise.resolve();
	}

	/**
	 * Span is finished.
	 *
	 * @param {Span} span
	 * @memberof ZipkinTraceExporter
	 */
	spanFinished(span) {
		this.queue.push(span);
	}

	/**
	 * Flush tracing data to Datadog server
	 *
	 * @memberof ZipkinTraceExporter
	 */
	flush() {
		if (this.queue.length == 0) return;

		const data = this.generateTracingData();
		this.queue.length = 0;

		fetch(`${this.opts.baseURL}/api/v2/spans`, {
			method: "post",
			body: JSON.stringify(data),
			headers: {
				"Content-Type": "application/json",
			}
		}).then(res => {
			if (res.status >= 400) {
				this.logger.warn(`Unable to upload tracing spans to Zipkin. Status: ${res.status} ${res.statusText}`);
			} else {
				this.logger.debug(`Tracing spans (${data.length} spans) are uploaded to Zipkin. Status: ${res.statusText}`);
			}
		}).catch(err => {
			this.logger.warn("Unable to upload tracing spans to Zipkin. Error:" + err.message, err);
		});
	}

	/**
	 * Generate tracing data for Zipkin
	 *
	 * @returns {Array<Object>}
	 * @memberof ZipkinTraceExporter
	 */
	generateTracingData() {
		return this.queue.map(span => this.makePayload(span));
	}

	/**
	 * Create Zipkin v2 payload from metric event
	 *
	 * @param {Span} span
	 * @returns {Object}
	 */
	makePayload(span) {
		const serviceName = span.service ? span.service.fullName : null;
		const payload = {
			name: span.name,
			kind: "CONSUMER",

			// Trace & span IDs
			traceId: this.convertID(span.traceID),
			id: this.convertID(span.id),
			parentId: this.convertID(span.parentID),

			localEndpoint: { serviceName },
			remoteEndpoint: { serviceName },

			annotations: [
				{ timestamp: this.convertTime(span.startTime), value: "sr" },
				{ timestamp: this.convertTime(span.finishTime), value: "ss" },
			],

			timestamp: this.convertTime(span.startTime),
			duration: this.convertTime(span.duration),

			tags: {
				service: serviceName,
				"span.type": span.type,
			},

			debug: this.opts.payloadOptions.debug,
			shared: this.opts.payloadOptions.shared
		};

		if (span.error) {
			payload.tags["error"] = span.error.message;

			payload.annotations.push({
				value: "error",
				endpoint: { serviceName: serviceName, ipv4: "", port: 0 },
				timestamp: this.convertTime(span.finishTime)
			});
		}

		Object.assign(
			payload.tags,
			this.defaultTags || {},
			this.flattenTags(span.tags, true),
			this.flattenTags(this.errorToObject(span.error), true, "error") || {}
		);

		return payload;
	}

	/**
	 * Convert Context ID to Zipkin format
	 *
	 * @param {String} id
	 * @returns {String}
	 */
	convertID(id) {
		return id ? id.replace(/-/g, "").substring(0, 16) : null;
	}

	/**
	 * Convert JS timestamp to microseconds
	 *
	 * @param {Number} ts
	 * @returns {Number}
	 */
	convertTime(ts) {
		return ts != null ? Math.round(ts * 1000) : null;
	}

}

module.exports = ZipkinTraceExporter;
