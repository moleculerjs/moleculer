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

class HistogramMetric extends BaseMetric {

	constructor(opts) {
		opts.type = METRIC.TYPE_HISTOGRAM;
		super(opts);

		if (_.isPlainObject(opts.linearBuckets)) {
			this.buckets = HistogramMetric.generateLinearBuckets(opts.linearBuckets.start, opts.linearBuckets.width, opts.linearBuckets.count);
		} else if (_.isPlainObject(opts.exponentialBuckets)) {
			this.buckets = HistogramMetric.generateExponentialBuckets(opts.exponentialBuckets.start, opts.exponentialBuckets.factor, opts.exponentialBuckets.count);
		} else if (Array.isArray(opts.buckets)) {
			this.buckets = Array.from(opts.buckets);
		} else if (opts.buckets === true) {
			this.buckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
		}
		if (this.buckets) {
			this.buckets.sort(sortAscending);
		}

		if (Array.isArray(opts.quantiles)) {
			this.quantiles = Array.from(opts.quantiles);
		} else if (opts.quantiles === true) {
			this.quantiles = [0.5, 0.9, 0.95, 0.99, 0.999];
		}
		if (this.quantiles) {
			this.quantiles.sort(sortAscending);
			this.maxAgeSeconds = opts.maxAgeSeconds || 60; // 1 minute
			this.ageBuckets = opts.ageBuckets || 10; // 10 secs per bucket
		}

		this.clear();
	}

	clear() {
		super.clear();

		this.sum = 0;
		this.count = 0;
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
				item.quantileValues = new TimeWindowQuantiles(this.quantiles, this.maxAgeSeconds, this.ageBuckets);
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

		return item;
	}

	createBucketValues() {
		return this.buckets.reduce((a, bound) => {
			a[bound] = 0;
			return a;
		}, {});
	}

	toString() {
		const item = this.get();
		if (item) {
			const s = [];
			s.push(`Count: ${item.count}`);
			//			s.push(`Sum: ${item.sum.toFixed(2)}`);

			if (this.buckets) {
				this.buckets.forEach((b, i) => {
					s.push(`${b}: ${item.bucketValues[b] != null ? item.bucketValues[b] : "-"}`);
					//s.push(`+Inf: ${item.count}`);
				});
			}

			if (this.quantiles) {
				const res = item.quantileValues.snapshot();
				s.push(`Min: ${res.min.toFixed(2)}`);
				s.push(`Mean: ${res.mean.toFixed(2)}`);
				s.push(`Var: ${res.variance.toFixed(2)}`);
				s.push(`StdDev: ${res.stdDev.toFixed(2)}`);
				s.push(`Max: ${res.max.toFixed(2)}`);
				this.quantiles.forEach((q, i) => {
					s.push(`${q}: ${res.quantiles[i].toFixed(2)}`);
				});
			}

			return s.join(" | ");
		}
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
	constructor(quantiles, maxAgeSeconds, ageBuckets) {
		this.quantiles = Array.from(quantiles);
		this.maxAgeSeconds = maxAgeSeconds;
		this.ageBuckets = ageBuckets;
		this.ringBuckets = [];
		for(let i = 0; i < ageBuckets; i++) {
			this.ringBuckets.push(new Bucket());
		}
		this.currentBucket = -1;
		this.rotate();

		this.dirty = true;
		this.lastSnapshot = null;
	}

	rotate() {
		this.currentBucket = (this.currentBucket + 1) % this.ageBuckets;
		this.ringBuckets[this.currentBucket].clear();
		this.dirty = true;

		setTimeout(() => this.rotate(), (this.maxAgeSeconds / this.ageBuckets) * 1000);
	}

	add(value) {
		this.dirty = true;
		this.ringBuckets[this.currentBucket].add(value);
	}

	snapshot() {
		if (!this.dirty && this.lastSnapshot)
			return this.lastSnapshot;

		const samples = this.ringBuckets.reduce((a, b) => a.concat(b.samples), []);
		if (samples.length == 0)
			return {};

		samples.sort(sortAscending);

		const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
		const variance = samples.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (samples.length - 1);
		const stdDev = Math.sqrt(variance);

		this.lastSnapshot = {
			min: samples[0],
			mean,
			variance,
			stdDev,
			max: samples[samples.length - 1],
			quantiles: this.quantiles.map(p => samples[Math.ceil(p * samples.length) - 1])
		};
		this.dirty = false;

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
