/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const BaseMetric = require("./base");
const _ = require("lodash");
const { METRIC_TYPE_HISTROGRAM } = require("../constants");

const sortAscending = (a, b) => a - b;

class HistogramMetric extends BaseMetric {

	constructor(opts) {
		opts.type = METRIC_TYPE_HISTROGRAM;
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

		if (Array.isArray(opts.percentiles)) {
			this.percentiles = Array.from(opts.percentiles);
		} else if (opts.percentiles === true) {
			this.percentiles = [0.01, 0.05, 0.5, 0.9, 0.95, 0.99, 0.999];
		}
		if (this.percentiles) {
			this.percentiles.sort(sortAscending);
			this.maxAgeSeconds = opts.maxAgeSeconds || 60 * 10;
			this.ageBuckets = opts.ageBuckets || 5;
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

			if (this.buckets) {
				item.bucketValues = this.createBucketValues();
				item.sum = 0;
				item.count = 0;
			}

			if (this.percentiles) {
				item.quantileValues = new TimeWindowQuantiles(this.percentiles, this.maxAgeSeconds, this.ageBuckets);
			}

			this.values.set(hash, item);
		}

		item.timestamp = timestamp == null ? Date.now() : timestamp;

		if (item.bucketValues) {
			item.sum += value;
			item.count++;

			const len = this.buckets.length;
			for (let i = 0; i < len; i++) {
				if (value <= this.buckets[i]) {
					item.bucketValues[i] += 1;
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
	constructor(percentiles, maxAgeSeconds, ageBuckets) {
		this.percentiles = Array.from(percentiles);
		this.maxAgeSeconds = maxAgeSeconds;
		this.ageBuckets = ageBuckets;
		this.ringBuckets = [];
		for(let i = 0; i < ageBuckets; i++) {
			this.ringBuckets.push(new Bucket(percentiles));
		}
		this.currentBucket = -1;
		this.rotate();
	}

	rotate() {
		this.currentBucket = (this.currentBucket + 1) % this.ageBuckets;
		this.ringBuckets[this.currentBucket].clear();

		setTimeout(() => this.rotate(), (this.maxAgeSeconds / this.ageBuckets) * 1000);
	}

	add(value) {
		this.ringBuckets[this.currentBucket].add(value);
	}

	calc() {
		const samples = this.ringBuckets.reduce((a, b) => a.concat(b.samples), []);
		if (samples.length == 0)
			return {};

		samples.sort(sortAscending);

		return {
			min: samples[0],
			mean: samples.reduce((a, b) => a + b, 0) / samples.length,
			max: samples[samples.length - 1],
			percentiles: this.percentiles.map(p => samples[Math.ceil(p * samples.length) - 1])
		};
	}
}

class Bucket {
	constructor(percentiles) {
		//this.percentiles = percentiles;
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
