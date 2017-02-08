"use strict";

class BrokerStatistics {
	constructor() {
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
	}

	addRequest(latency, errCode) {

	}

	calculate() {

	}

	toJSON() {

	}
}

module.exports = BrokerStatistics;