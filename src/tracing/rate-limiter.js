/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");

/**
 * Rate Limiter class for Tracing.
 *
 * Inspired by
 * 	https://github.com/jaegertracing/jaeger-client-node/blob/master/src/rate_limiter.js
 *
 * @class RateLimiter
 */
class RateLimiter {
	constructor(opts) {
		this.opts = _.defaultsDeep(opts, {
			tracesPerSecond: 1
		});

		this.lastTime = Date.now();
		this.balance = 0;
		this.maxBalance = this.opts.tracesPerSecond < 1 ? 1 : this.opts.tracesPerSecond;
	}

	check(cost = 1) {
		const now = Date.now();
		const elapsedTime = (now - this.lastTime) / 1000;
		this.lastTime = now;

		this.balance += elapsedTime * this.opts.tracesPerSecond;
		if (this.balance > this.maxBalance)
			this.balance = this.maxBalance;

		if (this.balance >= cost) {
			this.balance -= cost;
			return true;
		}

		return false;
	}
}

module.exports = RateLimiter;
