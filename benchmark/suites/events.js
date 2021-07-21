"use strict";

let Benchmarkify = require("benchmarkify");
let benchmark = new Benchmarkify("Event benchmark").printHeader();

let ServiceBroker = require("../../src/service-broker");

let bench = benchmark.createSuite("Emit event");

(function () {
	// Create broker
	let broker = new ServiceBroker({ logger: false });

	bench.ref("Emit event without subscribers", () => {
		return broker.emit("event", ["param1", { a: 1, b: "Teszt" }, 500]);
	});
})();

(function () {
	// Create broker
	let broker = new ServiceBroker({ logger: false });

	broker.createService({
		name: "handler",
		events: {
			event(p) {
				return p;
			}
		}
	});

	bench.add("Emit simple event to 1 subscribers", () => {
		return broker.emit("event", ["param1", { a: 1, b: "Teszt" }, 500]);
	});
})();

(function () {
	// Create broker
	let broker = new ServiceBroker({ logger: false });

	for (let i = 0; i < 20; i++)
		broker.createService({
			name: `handler-${i}`,
			events: {
				event(p) {
					return p;
				}
			}
		});

	bench.add("Emit simple event to 20 subscribers", () => {
		return broker.emit("event", ["param1", { a: 1, b: "Teszt" }, 500]);
	});
})();

(function () {
	// Create broker
	let broker = new ServiceBroker({ logger: false });

	for (let i = 0; i < 20; i++)
		broker.createService({
			name: `handler-${i}`,
			events: {
				"event.*"(p) {
					return p;
				}
			}
		});

	bench.add("Emit wildcard event to 20 subscribers", () => {
		return broker.emit("event.target", ["param1", { a: 1, b: "Teszt" }, 500]);
	});
})();

(function () {
	// Create broker
	let broker = new ServiceBroker({ logger: false });

	for (let i = 0; i < 20; i++)
		broker.createService({
			name: `handler-${i}`,
			events: {
				"event.**"(p) {
					return p;
				}
			}
		});

	bench.add("Emit multi-wildcard event to 20 subscribers without params", () => {
		return broker.emit("event.target.name");
	});
})();

(function () {
	// Create broker
	let broker = new ServiceBroker({ logger: false });

	for (let i = 0; i < 20; i++)
		broker.createService({
			name: `handler-${i}`,
			events: {
				"event.**"(p) {
					return p;
				}
			}
		});

	bench.add("Emit multi-wildcard event to 20 subscribers with params", () => {
		return broker.emit("event.target.name", ["param1", { a: 1, b: "Teszt" }, 500]);
	});
})();

bench.run();

/*

===================
  Event benchmark
===================

Platform info:
==============
   Windows_NT 6.1.7601 x64
   Node.JS: 8.11.0
   V8: 6.2.414.50
   Intel(R) Core(TM) i7-4770K CPU @ 3.50GHz × 8

Suite: Emit event
√ Emit event without subscribers                                     7,093,574 rps
√ Emit simple event to 1 subscribers                                 6,318,996 rps
√ Emit simple event to 20 subscribers                                6,428,321 rps
√ Emit wildcard event to 20 subscribers                              6,684,002 rps
√ Emit multi-wildcard event to 20 subscribers without params         7,176,790 rps
√ Emit multi-wildcard event to 20 subscribers with params            6,577,082 rps

   Emit event without subscribers (#)                                    0%      (7,093,574 rps)   (avg: 140ns)
   Emit simple event to 1 subscribers                               -10.92%      (6,318,996 rps)   (avg: 158ns)
   Emit simple event to 20 subscribers                               -9.38%      (6,428,321 rps)   (avg: 155ns)
   Emit wildcard event to 20 subscribers                             -5.77%      (6,684,002 rps)   (avg: 149ns)
   Emit multi-wildcard event to 20 subscribers without params        +1.17%      (7,176,790 rps)   (avg: 139ns)
   Emit multi-wildcard event to 20 subscribers with params           -7.28%      (6,577,082 rps)   (avg: 152ns)
-----------------------------------------------------------------------

*/
