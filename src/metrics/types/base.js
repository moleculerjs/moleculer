/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";


class BaseMetric {

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

	setDirty() {
		this.dirty = true;
		this.registry.setDirty();
	}

	clearDirty() {
		this.dirty = false;
	}

	get(labels) {
		const hash = this.hashingLabels(labels);
		return this.values.get(hash);
	}

	reset(/*labels, timestamp*/) {
		throw new Error("Not implemented");
	}

	resetAll(/*timestamp*/) {
		throw new Error("Not implemented");
	}

	clear() {
		this.values = new Map();
		this.setDirty();
	}

	hashingLabels(labels) {
		if (this.labelNames.length == 0 || labels == null || typeof labels !== "object") {
			return "";
		}

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

	snapshot() {
		if (!this.dirty && this.lastSnapshot)
			return this.lastSnapshot;

		this.lastSnapshot = this.generateSnapshot();
		this.clearDirty();

		return this.lastSnapshot;
	}

	generateSnapshot() {
		throw new Error("Not implemented");
	}
}

module.exports = BaseMetric;
