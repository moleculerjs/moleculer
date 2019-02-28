"use strict";

const { generateToken } = require("../utils");

class Span {

	constructor(tracer, name, opts) {
		this.tracer = tracer;
		this.name = name;
		this.opts = opts || {};
		this.rootSpanID = this.opts.rootSpanID;
		this.priority = this.opts.priority != null ? this.opts.priority : 5;
		this.id = opts.id || generateToken();
		this.sampled = this.opts.sampled != null ? this.opts.sampled : this.tracer.shouldSample(this);

		this.startTime = null;
		this.startHrTime = null;
		this.finishMs = null;
		this.duration = null;

		this.logs = [];
		this.tags = {};

		if (this.opts.tags)
			this.addTags(this.opts.tags);
	}

	start(time) {
		this.startTime = time || Date.now();
		this.startHrTime = process.hrtime();

		return this;
	}

	addTags(obj) {
		Object.assign(this.tags, obj);

		return this;
	}

	getElapsedTime() {
		const diff = process.hrtime(this.startHrTime);
		return (diff[0] * 1e3) + (diff[1] / 1e6);
	}

	log(name, fields, time) {
		const elapsed = time ? time - this.startTime : this.getElapsedTime();

		this.logs.push({
			name,
			fields: fields || {},
			time: time || Date.now(),
			elapsed
		});

		return this;
	}

	finish(time) {
		if (time) {
			this.duration = time - this.startTime;
			this.stopTime = time;
		} else {
			this.duration = this.getElapsedTime();
			this.stopTime = this.startTime + this.duration;
		}

		return this;
	}

	startSpan(name, opts) {
		const r = {
			rootSpanID: this.id,
			sampled: this.sampled
		};
		return this.tracer.startSpan(name, opts ? Object.assign(r, opts) : r);
	}

}

module.exports = Span;

/*

    trace_id: new Uint64BE(0x12345678, 0x9abcdef0),
    span_id: new Uint64BE(0x12345678, 0x12345678),
    parent_id: null,
    name: 'root',
    resource: '/',
    service: 'benchmark',
    type: 'web',
    error: 0,
    meta: {},
    metrics: {},
    start: 1500000000000123600,
    duration: 100000000

*/

/*
    this.type = 'Span'
    this.traceId = null
    this.guid = null
    this.parentId = null
    this.transactionId = null
    this.sampled = null
    this.priority = null
    this.name = null
    this.category = CATEGORIES.GENERIC
    this.component = null
    this.timestamp = null
    this.duration = null
    this['nr.entryPoint'] = null
    this['span.kind'] = null
*/
