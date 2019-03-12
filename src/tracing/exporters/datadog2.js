"use strict";

const _ 					= require("lodash");
const Promise 				= require("bluebird");
const BaseTraceExporter 	= require("./base");

/*
	docker run -d --name dd-agent -v /var/run/docker.sock:/var/run/docker.sock:ro -v /proc/:/host/proc/:ro -v /sys/fs/cgroup/:/host/sys/fs/cgroup:ro -e DD_API_KEY=123456 -e DD_APM_ENABLED=true -e DD_APM_NON_LOCAL_TRAFFIC=true -p 8126:8126  datadog/agent:latest
*/

let DatadogSpanContext;

/**
 * Datadog Trace Exporter with 'dd-trace'.
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
			agentHost: process.env.DD_AGENT_HOST || "localhost",
			agentPort: process.env.DD_AGENT_PORT || 8126,
			env: process.env.DD_ENVIRONMENT,
			samplingPriority: "USER_KEEP",
			defaultTags: null,
			tracerOptions: null,
		});

		this.ddTracer = null;
	}

	/**
	 * Initialize Trace Exporter.
	 *
	 * @param {Tracer} tracer
	 * @memberof DatadogTraceExporter
	 */
	init(tracer) {
		super.init(tracer);

		try {
			const ddTrace = require("dd-trace");
			DatadogSpanContext = require("dd-trace/src/opentracing/span_context");
			this.ddTracer = ddTrace.init(Object.assign({
				hostname: this.opts.agentHost,
				port: this.opts.agentPort,
				debug: true,
			}, this.opts.tracerOptions || {}));
		} catch(err) {
			/* istanbul ignore next */
			this.tracer.broker.fatal("The 'dd-trace' package is missing! Please install it with 'npm install dd-trace --save' command!", err, true);
		}

		this.defaultTags = _.isFunction(this.opts.defaultTags) ? this.opts.defaultTags.call(this, tracer) : this.opts.defaultTags;
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
	finishSpan(span) {
		this.generateDatadogTraceSpan(span);
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
	 * @param {Span} span
	 * @memberof DatadogTraceExporter
	 */
	generateDatadogTraceSpan(span) {
		const serviceName = span.service ? span.service.fullName : null;
		if (!this.ddTracer) return null;

		let parentCtx;
		if (span.parentID) {
			parentCtx = new DatadogSpanContext({
				traceId: this.convertID(span.traceID),
				spanId: this.convertID(span.parentID),
				parentId: this.convertID(span.parentID)
			});
		}

		const ddSpan = this.ddTracer.startSpan(span.name, {
			startTime: span.startTime,
			childOf: parentCtx,
			tags: this.flattenTags(_.defaultsDeep({
				service: span.service,
				span: {
					kind: "server",
					type: "custom",
				},
				resource: span.tags.action,
				env: this.opts.env,
				//"sampling.priority": this.opts.samplingPriority,
			}, span.tags, this.defaultTags))
		});

		this.addTags(ddSpan, "service", serviceName);

		if (span.error) {
			this.addTags(ddSpan, "error", this.errorToObject(span.error));
		}

		const sc = ddSpan.context();
		sc.traceId = this.convertID(span.traceID);
		sc.spanId = this.convertID(span.id);

		ddSpan.finish(span.endTime);

		return ddSpan;
		/*
		const traces = this.queue.reduce((store, span) => {
			const traceID = span.traceID;

			const ddSpan = {
				trace_id: this.convertIDToNumber(traceID),
				span_id: this.convertIDToNumber(span.id),
				parent_id: this.convertIDToNumber(span.parentID),
				name: span.name,
				resource: span.tags.action ? span.tags.action.name : null,
				service: span.service ? span.service.fullName: null,
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

			if (!store[traceID])
				store[traceID] = [ddSpan];
			else
				store[traceID].push(ddSpan);

			return store;
		}, {});

		return Object.values(traces);*/
	}


	/**
	 * Add tags to span
	 *
	 * @param {Object} span
	 * @param {String} key
	 * @param {any} value
	 * @param {String?} prefix
	 */
	addTags(span, key, value, prefix) {
		const name = prefix ? `${prefix}.${key}` : key;
		if (typeof value == "object") {
			Object.keys(value).forEach(k => this.addTags(span, k, value[k], name));
		} else {
			span.setTag(name, value);
		}
	}

	/**
	 * Convert Trace/Span ID to Jaeger format
	 *
	 * @param {String} id
	 * @returns {String}
	 */
	convertID(id) {
		if (id)
			return Buffer.from(id.replace(/-/g, "").substring(0, 16), "hex");

		return null;
	}
}

module.exports = DatadogTraceExporter;
