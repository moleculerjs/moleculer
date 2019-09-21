/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const INTERVAL = 5;
const SECONDS_PER_MINUTE = 60.0;

// https://github.com/dropwizard/metrics/blob/4.0-maintenance/metrics-core/src/main/java/com/codahale/metrics/EWMA.java
function getAlpha(min) {
	return 1 - Math.exp(-INTERVAL / SECONDS_PER_MINUTE / min);
}

class MetricRate {

	constructor(metric, item, min) {
		this.metric = metric;
		this.item = item;
		this.min = min;
		//this.alpha = getAlpha(min);

		this.rate = 0;

		this.lastValue = 0;
		this.lastTickTime = Date.now();
		this.value = null;

		this.timer = setInterval(() => this.tick(), INTERVAL * 1000).unref();
	}

	update(value) {
		this.value = value;
	}

	tick() {
		// Get elapsed seconds
		const now = Date.now();
		const elapsedSec = (now - this.lastTickTime) / 1000;
		this.lastTickTime = now;

		// Get difference between new and old value
		const diff = this.value - this.lastValue;
		this.lastValue = this.value;

		// Calculate the current requests/minute
		const oneMinRate = diff / elapsedSec * SECONDS_PER_MINUTE;

		// Weighted calculation
		let rate = this.rate + (oneMinRate - this.rate) * 0.5;
		// EWMA: const rate = this.rate + (this.alpha * (oneMinRate - this.rate));

		// Rounding
		if (Math.abs(rate) < 0.05) rate = 0;
		const changed = Math.abs(rate - this.rate) > 0.01;

		this.rate = rate;

		if (changed)
			this.metric.changed(this.item.value, this.item.labels, now);
	}

	reset() {
		this.lastValue = 0;
		this.value = null;

		this.rate = 0;
	}

}
module.exports = MetricRate;
