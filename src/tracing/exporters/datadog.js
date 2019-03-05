"use strict";

const _ 					= require("lodash");
const Promise 				= require("bluebird");
const fetch 				= require("node-fetch");
const { MoleculerError } 	= require("../../errors");
const BaseTraceExporter 	= require("./base");

fetch.Promise = Promise;

/*
	docker run -d --name dd-agent -v /var/run/docker.sock:/var/run/docker.sock:ro -v /proc/:/host/proc/:ro -v /sys/fs/cgroup/:/host/sys/fs/cgroup:ro -e DD_API_KEY=123456 -p 8126:8126 datadog/agent:latest
*/

/**
 * Datadog Trace Exporter.
 *
 * @class DatadogTraceExporter
 */
class DatadogTraceExporter extends BaseTraceExporter {

	/**
	 * Creates an instance of DatadogTraceExporter.
	 * @param {Object?} opts
	 * @memberof DatadogTraceExporter
	 */
	constructor(opts) {
		super(opts);

		this.opts = _.defaultsDeep(this.opts, {
			agentUrl: "http://localhost:8126/v0.4/traces",
			interval: 5
		});

		/*if (!this.opts.apiKey)
			throw new MoleculerError("Datadog API key is missing. Set DATADOG_API_KEY environment variable.");
		if (!this.opts.appKey)
			throw new MoleculerError("Datadog APP key is missing. Set DATADOG_APP_KEY environment variable.");
		*/
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

		this.timer = setInterval(() => this.flush(), this.opts.interval * 1000);
	}

	/**
	 * Span is started.
	 *
	 * @param {Span} span
	 * @memberof DatadogTraceExporter
	 */
	startSpan(span) {
		/*this.spans[span.id] = {
			span,
			children: []
		};

		if (span.parentID) {
			const parentItem = this.spans[span.parentID];
			if (parentItem)
				parentItem.children.push(span.id);
		}*/
	}

	/**
	 * Span is finished.
	 *
	 * @param {Span} span
	 * @memberof DatadogTraceExporter
	 */
	finishSpan(span) {
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
				"Content-Type": "application/json",

			}
		}).then(res => {
			this.logger.info("Metrics are uploaded to DataDog. Status: ", res.statusText);
		}).catch(err => {
			this.logger.warn("Unable to upload metrics to Datadog server. Error:" + err.message, err);
		});
	}

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

	generateDatadogTracingData() {
		const traces = this.queue.reduce((store, span) => {
			const traceID = span.traceID;

			const ddSpan = {
				trace_id: this.convertIDToNumber(traceID),
				span_id: this.convertIDToNumber(span.id),
				parent_id: this.convertIDToNumber(span.parentID),
				name: span.name,
				resource: span.tags.action ? span.tags.action.name : null,
				service: span.tags.service ? span.tags.service.name : null,
				type: "custom",
				start: Math.round(span.startTime * 1e6),
				duration: Math.round(span.duration * 1e6),
				error: span.tags.error ? 1 : 0,
				meta: this.flattenTags(span.tags)
			};

			if (!store[traceID])
				store[traceID] = [ddSpan];
			else
				store[traceID].push(ddSpan);

			return store;
		}, {});

		return Object.values(traces);
	}

	flattenTags(obj, path = "") {
		return Object.keys(obj).reduce((res, k) => {
			const o = obj[k];
			const pp = (path ? path + "." : "") + k;

			if (_.isObject(o))
				Object.assign(res, this.flattenTags(o, pp));
			else
				res[pp] = String(o);

			return res;
		}, {});
	}

}

module.exports = DatadogTraceExporter;
