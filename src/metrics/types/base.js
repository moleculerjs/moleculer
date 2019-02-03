/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

/**
 * Abstract Base Metric class.
 *
 * @class BaseMetric
 */
class BaseMetric {

	/**
	 * Creates an instance of BaseMetric.
	 * @param {Object} opts
	 * @param {MetricRegistry} registry
	 * @memberof BaseMetric
	 */
	constructor(opts, registry) {
		this.registry = registry;
		this.type = opts.type;
		this.name = opts.name;
		this.description = opts.description;
		this.labelNames = opts.labelNames || [];
		this.unit = opts.unit;
		this.aggregator = opts.aggregator || registry.opts.defaultAggregator;

		this.lastSnapshot = null;
		this.dirty = false;
		this.setDirty();

		this.values = new Map();
	}

	/**
	 * Set dirty flag
	 *
	 * @memberof BaseMetric
	 */
	setDirty() {
		this.dirty = true;
		this.registry.setDirty();
	}

	/**
	 * Clear dirty flag
	 *
	 * @memberof BaseMetric
	 */
	clearDirty() {
		this.dirty = false;
	}

	/**
	 * Get metric item by labels
	 *
	 * @param {Object?} labels
	 * @returns {Object}
	 * @memberof BaseMetric
	 */
	get(labels) {
		const hash = this.hashingLabels(labels);
		return this.values.get(hash);
	}

	/**
	 * Reset item by labels
	 *
	 * @memberof BaseMetric
	 */
	reset(/*labels, timestamp*/) {
		throw new Error("Not implemented");
	}

	/**
	 * Reset all items
	 *
	 * @memberof BaseMetric
	 */
	resetAll(/*timestamp*/) {
		throw new Error("Not implemented");
	}

	/**
	 * Clear metric values.
	 *
	 * @memberof BaseMetric
	 */
	clear() {
		this.values = new Map();
		this.setDirty();
	}

	/**
	 * Create a hash from label values. It will
	 * be used as a key in Map.
	 *
	 * @param {Object} labels
	 * @returns {String}
	 * @memberof BaseMetric
	 */
	hashingLabels(labels) {
		if (this.labelNames.length == 0 || labels == null || typeof labels !== "object")
			return "";

		const parts = [];
		for (let i = 0; i < this.labelNames.length; i++) {
			const v = labels[this.labelNames[i]];
			if (typeof v == "number")
				parts.push(v);
			else if (typeof v === "string")
				parts.push("\"" + v + "\"");
			else
				parts.push("");
		}
		return parts.join("|");
	}

	/**
	 * Get a snapshot.
	 *
	 * @returns {Object}
	 * @memberof BaseMetric
	 */
	snapshot() {
		if (!this.dirty && this.lastSnapshot)
			return this.lastSnapshot;

		this.lastSnapshot = this.generateSnapshot();
		this.clearDirty();

		return this.lastSnapshot;
	}

	/**
	 * Generate a snapshot.
	 *
	 * @memberof BaseMetric
	 */
	generateSnapshot() {
		throw new Error("Not implemented");
	}
}

module.exports = BaseMetric;
