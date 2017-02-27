"use strict";

let BrokerStatistics = require("../../src/statistics");
let ServiceBroker = require("../../src/service-broker");
const lolex = require("lolex");

describe("Test Statistics constructor", () => {
	let broker = new ServiceBroker();

	it("should create default options", () => {
		let stat = new BrokerStatistics(broker);
		expect(stat).toBeDefined();
		expect(stat.broker).toBe(broker);
		expect(stat.options).toEqual({});

		expect(stat.addRequest).toBeInstanceOf(Function);
		expect(stat.snapshot).toBeInstanceOf(Function);
	});


});

describe("Test Statistics snapshot", () => {
	let broker = new ServiceBroker();

	let clock;
	beforeAll(() => {
		clock = lolex.install();
	});

	afterAll(() => {
		clock.uninstall();
	});	

	it("should return an empty stats object", () => {
		let stat = new BrokerStatistics(broker);
		clock.tick(10);

		let res = stat.snapshot();
		expect(res).toBeDefined();
		expect(res.requests).toBeDefined();
		expect(res.requests).toEqual({ 
			"actions": {}, 
			"total": { 
				"count": 0, 
				"errors": {}, 
				"rps": { 
					"current": 0, 
					"values": []
				} 
			} 
		});
	});

	it("should return stats after 1 success req", () => {
		let stat = new BrokerStatistics(broker);
		stat.addRequest("posts.find", 50, null);
		clock.tick(10);

		let res = stat.snapshot();
		expect(res).toBeDefined();
		expect(res.requests).toBeDefined();
		expect(res.requests).toEqual({
			"actions": {
				"posts.find": {
					"count": 1,
					"errors": {},
					"latency": {
						"90th": 50,
						"95th": 50,
						"99.5th": 50,
						"99th": 50,
						"mean": 50,
						"median": 50
					},
					"rps": {
						"current": 100,
						"values": []
					}
				}
			},
			"total": {
				"count": 1,
				"errors": {},
				"latency": {
					"90th": 50,
					"95th": 50,
					"99.5th": 50,
					"99th": 50,
					"mean": 50,
					"median": 50
				},
				"rps": {
					"current": 100,
					"values": []
				}
			}
		});
	});

	it("should return stats after 1 error req", () => {
		let stat = new BrokerStatistics(broker);
		stat.addRequest("posts.find", 50, 408);
		clock.tick(10);

		let res = stat.snapshot();
		expect(res).toBeDefined();
		expect(res.requests).toBeDefined();
		expect(res.requests).toEqual({
			"actions": {
				"posts.find": {
					"count": 1,
					"errors": {
						"408": 1
					},
					"latency": {
						"90th": 50,
						"95th": 50,
						"99.5th": 50,
						"99th": 50,
						"mean": 50,
						"median": 50
					},
					"rps": {
						"current": 100,
						"values": []
					}
				}
			},
			"total": {
				"count": 1,
				"errors": {
					"408": 1
				},
				"latency": {
					"90th": 50,
					"95th": 50,
					"99.5th": 50,
					"99th": 50,
					"mean": 50,
					"median": 50
				},
				"rps": {
					"current": 100,
					"values": []
				}
			}
		});
	});	

	it("should return stats after 1 success req", () => {
		let stat = new BrokerStatistics(broker);
		stat.addRequest("posts.find", 10, null);
		stat.addRequest("posts.find", 3, null);
		stat.addRequest("posts.find", 12, null);
		clock.tick( 6 * 1000);
		stat.addRequest("posts.find", 100, null);
		stat.addRequest("posts.get", 250, null);
		stat.addRequest("posts.get", 300, null);
		stat.addRequest("posts.find", 80, null);
		stat.addRequest("posts.get", 110, null);
		clock.tick( 6 * 1000);

		let res = stat.snapshot();
		expect(res).toBeDefined();
		expect(res.requests).toBeDefined();
		expect(res.requests).toEqual({
			"actions": {
				"posts.find": {
					"count": 5,
					"errors": {},
					"latency": {
						"90th": 100,
						"95th": 100,
						"99.5th": 100,
						"99th": 100,
						"mean": 41,
						"median": 12
					},
					"rps": {
						"current": 0.5,
						"values": [0.60, 0.40]
					}
				},
				"posts.get": {
					"count": 3,
					"errors": {},
					"latency": {
						"90th": 300,
						"95th": 300,
						"99.5th": 300,
						"99th": 300,
						"mean": 220,
						"median": 250
					},
					"rps": {
						"current": 0.75,
						"values": [0.75]
					}
				}
			},
			"total": {
				"count": 8,
				"errors": {},
				"latency": {
					"90th": 300,
					"95th": 300,
					"99.5th": 300,
					"99th": 300,
					"mean": 108.125,
					"median": 80
				},
				"rps": {
					"current": 0.8,
					"values": [0.60, 1.00]
				}
			}
		});
	});

	it("should maximize count of buckets", () => {
		let stat = new BrokerStatistics(broker, { cycleTime: 1000, bucketCount: 5 });
		clock.tick( 10 * 1000);
		let res = stat.snapshot();
		expect(res).toBeDefined();
		expect(res.requests).toEqual({
			"actions": {},
			"total": {
				"count": 0,
				"errors": {},
				"rps": {
					"current": 0,
					"values": [0, 0, 0, 0]
				}
			}
		});
	});

});