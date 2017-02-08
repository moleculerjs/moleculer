"use strict";

/*

https://github.com/awolden/brakes/blob/master/lib/Stats.js

https://github.com/RisingStack/trace-nodejs/blob/master/lib/agent/metrics/rpm/index.js
*/

class BrokerStatistics {
	constructor(opts) {
		this.dirty = true;

		this.stat = {
			total: {
				reqCount: 0,
				rps: 0,
				errors: {
					"4xx": 0,
					"5xx": 0
				},
				latency: {
					mean: 0,
					median: 0,
					"90th": 0,
					"99th": 0,
					"99.5th": 0
				}
			},
			actions: {

			}
		};

		this.calcTimer = setInterval(() => {
			if (this.dirty)
				this.calculate();

		}, opts.interval || 5 * 1000);
	}

	addRequest(latency, errCode) {
		this.dirty = true;

	}

	calculate() {

	}

	toJSON() {

	}
}

module.exports = BrokerStatistics;