/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const BaseMetric = require("./base");
const _ = require("lodash");
const METRIC = require("../constants");

const sortAscending = (a, b) => a - b;
const setProp = (o, k, v) => {
	o[k] = v;
	return o;
};

class HistogramMetric extends BaseMetric {

	constructor(opts, registry) {
		super(opts, registry);
		this.type = METRIC.TYPE_HISTOGRAM;

		// Create buckets
		if (_.isPlainObject(opts.linearBuckets)) {
			this.buckets = HistogramMetric.generateLinearBuckets(opts.linearBuckets.start, opts.linearBuckets.width, opts.linearBuckets.count);
		} else if (_.isPlainObject(opts.exponentialBuckets)) {
			this.buckets = HistogramMetric.generateExponentialBuckets(opts.exponentialBuckets.start, opts.exponentialBuckets.factor, opts.exponentialBuckets.count);
		} else if (Array.isArray(opts.buckets)) {
			this.buckets = Array.from(opts.buckets);
		} else if (opts.buckets === true) {
			this.buckets = this.registry.opts.defaultBuckets;
		}
		if (this.buckets) {
			this.buckets.sort(sortAscending);
		}

		// Create quantiles
		if (Array.isArray(opts.quantiles)) {
			this.quantiles = Array.from(opts.quantiles);
		} else if (opts.quantiles === true) {
			this.quantiles = this.registry.opts.defaultQuantiles;
		}
		if (this.quantiles) {
			this.quantiles.sort(sortAscending);
			this.maxAgeSeconds = opts.maxAgeSeconds || this.registry.opts.defaultMaxAgeSeconds; // 1 minute
			this.ageBuckets = opts.ageBuckets || this.registry.opts.defaultAgeBuckets; // 10 secs per bucket
		}

		this.clear();
	}

	observe(value, labels, timestamp) {
		const hash = this.hashingLabels(labels);
		let item = this.values.get(hash);
		if (!item) {
			item = {
				labels: _.pick(labels, this.labelNames),
				timestamp: timestamp == null ? Date.now() : timestamp
			};
			item.sum = 0;
			item.count = 0;

			if (this.buckets) {
				item.bucketValues = this.createBucketValues();
			}

			if (this.quantiles) {
				item.quantileValues = new TimeWindowQuantiles(this, this.quantiles, this.maxAgeSeconds, this.ageBuckets);
			}

			this.values.set(hash, item);
		}

		item.timestamp = timestamp == null ? Date.now() : timestamp;
		item.sum += value;
		item.count++;

		if (item.bucketValues) {
			const len = this.buckets.length;
			for (let i = 0; i < len; i++) {
				if (value <= this.buckets[i]) {
					item.bucketValues[this.buckets[i]] += 1;
					// break;
				}
			}
		}

		if (item.quantileValues) {
			item.quantileValues.add(value);
		}
		this.setDirty();

		return item;
	}

	createBucketValues() {
		return this.buckets.reduce((a, bound) => setProp(a, bound, 0), {});
	}

	generateSnapshot() {
		const snapshot = Array.from(this.values.values()).map(item => this.generateItemSnapshot(item));
		return snapshot;
	}

	generateItemSnapshot(item) {
		if (!this.dirty && this.lastSnapshot)
			return this.lastSnapshot;

		const snapshot = {
			labels: item.labels,
			count: item.count,
			sum: item.sum,
			timestamp: item.timestamp,
		};

		if (this.buckets)
			snapshot.buckets = this.buckets.reduce((a, b) => setProp(a, b, item.bucketValues[b]), {});

		if (this.quantiles)
			Object.assign(snapshot, item.quantileValues.snapshot());

		return snapshot;
	}

	reset(labels, timestamp) {
		return this.set(null, labels, timestamp);
	}

	resetAll(timestamp) {
		Object.keys(this.values).forEach(hash => {
			this.values[hash].value = null;
			this.values[hash].timestamp = timestamp == null ? Date.now() : timestamp;
		});
		this.setDirty();
	}

	static generateLinearBuckets(start, width, count) {
		const buckets = [];
		for (let i = 0; i < count; i++)
			buckets.push(start + i * width);

		return buckets;
	}

	static generateExponentialBuckets(start, factor, count) {
		const buckets = [];
		for (let i = 0; i < count; i++)
			buckets[i] = start * Math.pow(factor, i);

		return buckets;
	}
}

class TimeWindowQuantiles {
	constructor(metric, quantiles, maxAgeSeconds, ageBuckets) {
		this.metric = metric;
		this.quantiles = Array.from(quantiles);
		this.maxAgeSeconds = maxAgeSeconds;
		this.ageBuckets = ageBuckets;
		this.ringBuckets = [];
		for(let i = 0; i < ageBuckets; i++) {
			this.ringBuckets.push(new Bucket());
		}
		this.dirty = true;

		this.currentBucket = -1;
		this.rotate();

		this.lastSnapshot = null;
		this.setDirty();
	}

	setDirty() {
		this.dirty = true;
		this.metric.setDirty();
	}

	clearDirty() {
		this.dirty = false;
	}

	rotate() {
		this.currentBucket = (this.currentBucket + 1) % this.ageBuckets;
		this.ringBuckets[this.currentBucket].clear();
		this.setDirty();

		setTimeout(() => this.rotate(), (this.maxAgeSeconds / this.ageBuckets) * 1000);
	}

	add(value) {
		this.setDirty();
		this.ringBuckets[this.currentBucket].add(value);
	}

	snapshot() {
		if (!this.dirty && this.lastSnapshot)
			return this.lastSnapshot;

		const samples = this.ringBuckets.reduce((a, b) => a.concat(b.samples), []);
		samples.sort(sortAscending);

		const mean = samples.length ? samples.reduce((a, b) => a + b, 0) / samples.length : null;
		const variance = samples.length > 1 ? samples.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (samples.length - 1) : null;
		const stdDev = variance ? Math.sqrt(variance) : null;

		this.lastSnapshot = {
			min: samples.length ? samples[0] : null,
			mean,
			variance,
			stdDev,
			max: samples.length ? samples[samples.length - 1] : null,
			quantiles: this.quantiles.reduce((a, q) => setProp(a, q, samples[Math.ceil(q * samples.length) - 1]), {})
		};

		this.clearDirty();

		return this.lastSnapshot;
	}
}

class Bucket {
	constructor() {
		this.count = 0;
		this.samples = [];
	}

	add(value) {
		this.samples.push(value);
		this.count++;
	}

	clear() {
		this.count = 0;
		this.samples.length = 0;
	}
}

module.exports = HistogramMetric;
