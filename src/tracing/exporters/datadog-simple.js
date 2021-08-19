"use strict";

const _ = require("lodash");
const fetch = require("node-fetch");
const BaseTraceExporter = require("./base");
const { isFunction } = require("../../utils");

/*
	docker run -d --name dd-agent --restart unless-stopped -v /var/run/docker.sock:/var/run/docker.sock:ro -v /proc/:/host/proc/:ro -v /sys/fs/cgroup/:/host/sys/fs/cgroup:ro -e DD_API_KEY=123456 -e DD_APM_ENABLED=true -e DD_APM_NON_LOCAL_TRAFFIC=true -p 8126:8126  datadog/agent:latest
*/

/**
 * Datadog Trace Exporter.
 *
 * @class DatadogTraceExporter
 */

/* istanbul ignore next */
class DatadogTraceExporter extends BaseTraceExporter {
	/**
	 * Creates an instance of DatadogTraceExporter.
	 * @param {Object?} opts
	 * @memberof DatadogTraceExporter
	 */
	constructor(opts) {
		super(opts);

		this.opts = _.defaultsDeep(this.opts, {
			agentUrl: process.env.DD_AGENT_URL || "http://localhost:8126/v0.4/traces",
			interval: 5,
			defaultTags: null
		});

		this.queue = [];
	}

	/**
	 * Initialize Trace Exporter.
	 *
	 * @param {Tracer} tracer
	 * @memberof DatadogTraceExporter
	 */
	init(tracer) {
		super.init(tracer);

		fetch.Promise = this.broker.Promise;

		if (this.opts.interval > 0) {
			this.timer = setInterval(() => this.flush(), this.opts.interval * 1000);
			this.timer.unref();
		}

		this.defaultTags = isFunction(this.opts.defaultTags)
			? this.opts.defaultTags.call(this, tracer)
			: this.opts.defaultTags;
		if (this.defaultTags) {
			this.defaultTags = this.flattenTags(this.defaultTags, true);
		}
	}

	/**
	 * Span is finished.
	 *
	 * @param {Span} span
	 * @memberof DatadogTraceExporter
	 */
	spanFinished(span) {
		this.queue.push(span);
	}

	/**
	 * Flush tracing data to Datadog server
	 *
	 * @memberof DatadogTraceExporter
	 */
	flush() {
		if (this.queue.length == 0) return;

		const data = this.generateDatadogTracingData();
		this.queue.length = 0;

		fetch(this.opts.agentUrl, {
			method: "post",
			body: JSON.stringify(data),
			headers: {
				"Content-Type": "application/json"
			}
		})
			.then(res => {
				this.logger.info(
					`Tracing spans (${data.length} traces) are uploaded to Datadog. Status: ${res.statusText}`
				);
			})
			.catch(err => {
				this.logger.warn(
					"Unable to upload tracing spans to Datadog. Error:" + err.message,
					err
				);
			});
	}

	/**
	 * Convert traceID & spanID to number for Datadog Agent.
	 * @param {String} str
	 */
	convertIDToNumber(str) {
		if (str == null) return str;

		try {
			return parseInt(str.substring(0, 8), 16);
		} catch (err) {
			this.logger.warn(`Unable to convert '${str}' to number.`);
			return null;
		}
	}

	/**
	 * Generate tracing data for Datadog
	 *
	 * @returns {Array<Object>}
	 * @memberof DatadogTraceExporter
	 */
	generateDatadogTracingData() {
		const traces = this.queue.reduce((store, span) => {
			const traceID = span.traceID;

			const ddSpan = {
				trace_id: this.convertIDToNumber(traceID),
				span_id: this.convertIDToNumber(span.id),
				parent_id: this.convertIDToNumber(span.parentID),
				name: span.name,
				resource: span.tags.action ? span.tags.action.name : null,
				service: span.service ? span.service.fullName : null,
				type: "custom",
				start: Math.round(span.startTime * 1e6),
				duration: Math.round(span.duration * 1e6),
				error: span.error ? 1 : 0,
				meta: Object.assign(
					{},
					this.defaultTags || {},
					this.flattenTags(span.tags, true),
					this.flattenTags(this.errorToObject(span.error), true, "error") || {}
				)
			};

			if (!store[traceID]) store[traceID] = [ddSpan];
			else store[traceID].push(ddSpan);

			return store;
		}, {});

		return Object.values(traces);
	}
}

module.exports = DatadogTraceExporter;
