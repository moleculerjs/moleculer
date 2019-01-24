/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const BaseMetric = require("./base");
const _ = require("lodash");
const { METRIC_TYPE_HISTROGRAM } = require("../constants");

const sortAscending = (x, y) => x - y;

class HistogramMetric extends BaseMetric {

	constructor(opts) {
		super(METRIC_TYPE_HISTROGRAM, opts);

		if (_.isPlainObject(opts.linearBuckets)) {
			this.buckets = HistogramMetric.generateLinearBuckets(opts.linearBuckets.start, opts.linearBuckets.width, opts.linearBuckets.count);
		} else if (_.isPlainObject(opts.exponentialBuckets)) {
			this.buckets = HistogramMetric.generateExponentialBuckets(opts.exponentialBuckets.start, opts.exponentialBuckets.factor, opts.exponentialBuckets.count);
		} else if (Array.isArray(opts.buckets)) {
			this.buckets = Array.from(opts.buckets);
		} else {
			this.buckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
		}

		this.buckets.sort(sortAscending);

		this.resetAll();
	}

	resetAll(timestamp) {
		this.sum = 0;
		this.count = 0;

		super.resetAll(timestamp);
	}

	observe(value, labels, timestamp) {
		const hash = this.hashingLabels(labels);
		let item = this.values.get(hash);
		if (!item) {
			item = {
				bucketValues: this.createBucketValues(),
				sum: 0,
				count: 0,
				labels: _.pick(labels, this.labelNames),
				timestamp: timestamp == null ? Date.now() : timestamp
			};
			this.values.set(hash, item);
		}

		item.timestamp = timestamp == null ? Date.now() : timestamp;
		item.sum += value;
		item.count++;

		for (let i = 0; i < this.buckets.length; i++) {
			if (value <= this.buckets[i]) {
				item.bucketValues[i] += 1;
				break;
			}
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

module.exports = HistogramMetric;
