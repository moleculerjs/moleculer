"use strict";

const _ 					= require("lodash");
const Promise 				= require("bluebird");
const fetch 				= require("node-fetch");
//const { MoleculerError } 	= require("../../errors");
const BaseTraceExporter 	= require("./base");

fetch.Promise = Promise;

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

			/** @type {Number} Batch send time interval. */
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

		this.timer = setInterval(() => this.flush(), this.opts.interval * 1000);

		this.defaultTags = _.isFunction(this.opts.defaultTags) ? this.opts.defaultTags.call(this, tracer) : this.opts.defaultTags;
		if (this.defaultTags) {
			this.defaultTags = this.flattenTags(this.defaultTags, true);
		}
	}

	/**
	 * Span is finished.
	 *
	 * @param {Span} span
	 * @memberof ZipkinTraceExporter
	 */
	finishSpan(span) {
		this.queue.push(span);
	}

	/**
	 * Flush tracing data to Datadog server
	 *
	 * @memberof ZipkinTraceExporter
	 */
	flush() {
		if (this.queue.length == 0) return;

		const data = this.generateZipkinTracingData();
		this.queue.length = 0;

		fetch(`${this.opts.baseURL}/api/v2/spans`, {
			method: "post",
			body: JSON.stringify(data),
			headers: {
				"Content-Type": "application/json",

			}
		}).then(res => {
			this.logger.info(`Tracing spans (${data.length} spans) are uploaded to Zipkin. Status: ${res.statusText}`);
		}).catch(err => {
			this.logger.warn("Unable to upload tracing spans to Zipkin. Error:" + err.message, err);
		});
	}

	/**
	 * Convert traceID & spanID to number for Datadog Agent.
	 * @param {String} str
	 */
	convertIDToNumber(str) {
		if (str == null)
			return str;

		try {
			return parseInt(str.substring(0, 8), 16);
		} catch(err) {
			this.logger.warn(`Unable to convert '${str}' to number.`);
			return null;
		}
	}

	/**
	 * Generate tracing data for Datadog
	 *
	 * @returns {Array<Object>}
	 * @memberof ZipkinTraceExporter
	 */
	generateZipkinTracingData() {
		return this.queue.map(span => this.makeZipkinPayloadV2(span));
	}

	/**
	 * Create Zipkin v2 payload from metric event
	 *
	 * @param {Span} span
	 * @returns {Object}
	 */
	makeZipkinPayloadV2(span) {
		const serviceName = span.service ? span.service.name : null;
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
			duration: Math.round(span.duration * 1000),

			tags: {},

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

		Object.assign(payload.tags, this.defaultTags || {}, this.flattenTags(span.tags, true));

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
		return Math.round(ts * 1000);
	}

}

module.exports = ZipkinTraceExporter;
