/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const { pick } = require("lodash");

class BaseMetric {

	constructor({ name, description, labelNames, initialValue, unit }) {
		if (!name)
			throw new Error("The name is mandatory");

		this.name = name;
		this.description = description;
		this.value = initialValue;
		this.labelNames = labelNames || [];
		this.initialValue = initialValue || 0;
		this.unit = unit;

		this.reset();
	}

	set(value, labels, timestamp) {
		const hash = this.hashingLabels(labels);
		let item = this.values.get(hash);
		if (item) {
			item.value = value;
			item.timestamp = timestamp == null ? Date.now() : timestamp;
		} else {
			item = {
				value,
				labels: pick(labels, this.labelNames),
				timestamp: timestamp == null ? Date.now() : timestamp
			};
			this.values.set(hash, item);
		}

		return item;
	}

	get(labels) {
		const hash = this.hashingLabels(labels);
		const item = this.values.get(hash);
		if (item)
			return item.value;
		else
			return null;
	}

	reset(labels, timestamp) {
		if (labels)
			return this.set(this.initialValue, labels, timestamp);

		// Reset the whole set
		this.values = new Map();
		if (this.initialValue != null) {
			this.set(this.initialValue);
		}
	}

	hashingLabels(labels) {
		if (this.labelNames.length == 0 || typeof labels !== "object") {
			return "";
		}

		const parts = [];
		for (let i = 0; i < this.labelNames.length; i++) {
			const v = labels[this.labelNames[i]];
			if (Number.isNumber(v))
				parts.push(v);
			else if (typeof v === "string")
				parts.push("\"" + v + "\"");
			else
				parts.push("");
		}
		return parts.join("|");
	}
}

module.exports = BaseMetric;
