/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const BaseMetric = require("./base");
const _ = require("lodash");
const METRIC = require("../constants");
const MetricRate = require("../rates");
const { isPlainObject } = require("../../utils")
const sortAscending = (a, b) => a - b;
const setProp = (o, k, v) => {
	o[k] = v;
	return o;
};

/**
 * Histogram metric class.
 *
 * @class HistogramMetric
 * @extends {BaseMetric}
 */
class HistogramMetric extends BaseMetric {

	/**
	 * Creates an instance of HistogramMetric.
	 * @param {Object} opts
	 * @param {MetricRegistry} registry
	 * @memberof HistogramMetric
	 */
	constructor(opts, registry) {
		super(opts, registry);
		this.type = METRIC.TYPE_HISTOGRAM;

		// Create buckets
		if (isPlainObject(opts.linearBuckets)) {
			this.buckets = HistogramMetric.generateLinearBuckets(opts.linearBuckets.start, opts.linearBuckets.width, opts.linearBuckets.count);
		} else if (isPlainObject(opts.exponentialBuckets)) {
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

		this.rate = opts.rate;
	}

	/**
	 * Observe a value.
	 *
	 * @param {Number} value
	 * @param {Object?} labels
	 * @param {Number?} timestamp
	 * @returns
	 * @memberof HistogramMetric
	 */
	observe(value, labels, timestamp) {
		const hash = this.hashingLabels(labels);
		let item = this.values.get(hash);
		if (!item) {
			item = this.resetItem({
				labels: _.pick(labels, this.labelNames)
			});

			if (this.rate)
				item.rate = new MetricRate(this, item, 1);

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
				}
			}
		}

		if (item.quantileValues) {
			item.quantileValues.add(value);
		}

		if (item.rate)
			item.rate.update(item.count);

		this.changed(value, labels, timestamp);

		return item;
	}

	/**
	 * Create new bucket values based on options.
	 *
	 * @returns {Object}
	 * @memberof HistogramMetric
	 */
	createBucketValues() {
		return this.buckets.reduce((a, bound) => setProp(a, bound, 0), {});
	}

	/**
	 * Generate a snapshot
	 *
	 * @returns {Array<Object>}
	 * @memberof HistogramMetric
	 */
	generateSnapshot() {
		return Array.from(this.values.keys()).map(key => this.generateItemSnapshot(this.values.get(key), key));
	}

	/**
	 * Generate a snapshot for an item
	 *
	 * @param {Object} item
	 * @param {String} key
	 * @returns {Object}
	 * @memberof HistogramMetric
	 */
	generateItemSnapshot(item, key) {
		const snapshot = {
			key,
			labels: item.labels,
			count: item.count,
			sum: item.sum,
			timestamp: item.timestamp,
		};

		if (this.buckets)
			snapshot.buckets = this.buckets.reduce((a, b) => setProp(a, b, item.bucketValues[b]), {});

		if (this.quantiles)
			Object.assign(snapshot, item.quantileValues.snapshot());

		if (item.rate)
			snapshot.rate = item.rate.rate;

		return snapshot;
	}

	/**
	 * Reset value of item.
	 *
	 * @param {Object} item
	 * @param {Number?} timestamp
	 */
	resetItem(item, timestamp) {
		item.timestamp = timestamp == null ? Date.now() : timestamp;
		item.sum = 0;
		item.count = 0;

		if (this.buckets) {
			item.bucketValues = this.createBucketValues();
		}

		if (this.quantiles) {
			item.quantileValues = new TimeWindowQuantiles(this, this.quantiles, this.maxAgeSeconds, this.ageBuckets);
		}

		return item;
	}

	/**
	 * Reset item by labels.
	 *
	 * @param {Object} labels
	 * @param {Number?} timestamp
	 * @returns
	 * @memberof HistogramMetric
	 */
	reset(labels, timestamp) {
		const hash = this.hashingLabels(labels);
		const item = this.values.get(hash);
		if (item) {
			this.resetItem(item, timestamp);
			this.changed(null, labels, timestamp);
		}
	}

	/**
	 * Reset all items.
	 *
	 * @param {Number?} timestamp
	 * @memberof HistogramMetric
	 */
	resetAll(timestamp) {
		this.values.forEach(item => this.resetItem(item, timestamp));
		this.changed();
	}

	/**
	 * Generate linear buckets
	 *
	 * @static
	 * @param {Number} start
	 * @param {Number} width
	 * @param {Number} count
	 * @returns {Array<Number>}
	 * @memberof HistogramMetric
	 */
	static generateLinearBuckets(start, width, count) {
		const buckets = [];
		for (let i = 0; i < count; i++)
			buckets.push(start + i * width);

		return buckets;
	}

	/**
	 * Generate exponential buckets
	 *
	 * @static
	 * @param {Number} start
	 * @param {Number} factor
	 * @param {Number} count
	 * @returns {Array<Number>}
	 * @memberof HistogramMetric
	 */
	static generateExponentialBuckets(start, factor, count) {
		const buckets = [];
		for (let i = 0; i < count; i++)
			buckets[i] = start * Math.pow(factor, i);

		return buckets;
	}
}

/**
 * Timewindow class for quantiles.
 *
 * @class TimeWindowQuantiles
 */
class TimeWindowQuantiles {

	/**
	 * Creates an instance of TimeWindowQuantiles.
	 * @param {BaseMetric} metric
	 * @param {Array<Number>} quantiles
	 * @param {Number} maxAgeSeconds
	 * @param {Number} ageBuckets
	 * @memberof TimeWindowQuantiles
	 */
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

	/**
	 * Set dirty flag.
	 *
	 * @memberof TimeWindowQuantiles
	 */
	setDirty() {
		this.dirty = true;
		this.metric.setDirty();
	}

	/**
	 * Clear dirty flag.
	 *
	 * @memberof TimeWindowQuantiles
	 */
	clearDirty() {
		this.dirty = false;
	}

	/**
	 * Rotate the ring buckets.
	 *
	 * @memberof TimeWindowQuantiles
	 */
	rotate() {
		this.currentBucket = (this.currentBucket + 1) % this.ageBuckets;
		this.ringBuckets[this.currentBucket].clear();
		this.setDirty();

		setTimeout(() => this.rotate(), (this.maxAgeSeconds / this.ageBuckets) * 1000).unref();
	}

	/**
	 * Add a new value to the current bucket.
	 *
	 * @param {Number} value
	 * @memberof TimeWindowQuantiles
	 */
	add(value) {
		this.setDirty();
		this.ringBuckets[this.currentBucket].add(value);
	}

	/**
	 * Generate a snapshot from buckets and calculate min, max, mean, quantiles, variance & StdDev.
	 *
	 * @returns {Object}
	 * @memberof TimeWindowQuantiles
	 */
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

/**
 * Bucket class
 *
 * @class Bucket
 */
class Bucket {
	/**
	 * Creates an instance of Bucket.
	 * @memberof Bucket
	 */
	constructor() {
		this.count = 0;
		this.samples = [];
	}

	/**
	 * Add value to the bucket.
	 *
	 * @param {Number} value
	 * @memberof Bucket
	 */
	add(value) {
		this.samples.push(value);
		this.count++;
	}

	/**
	 * Clear bucket.
	 *
	 * @memberof Bucket
	 */
	clear() {
		this.count = 0;
		this.samples.length = 0;
	}
}

HistogramMetric.Bucket = Bucket;
HistogramMetric.TimeWindowQuantiles = TimeWindowQuantiles;

module.exports = HistogramMetric;
