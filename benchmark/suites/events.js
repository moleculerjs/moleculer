"use strict";

let Benchmarkify = require("benchmarkify");
let benchmark = new Benchmarkify("Event benchmark").printHeader();

let ServiceBroker = require("../../src/service-broker");

let bench = benchmark.createSuite("Emit event");

(function() {
	// Create broker
	let broker = new ServiceBroker({ logger: false });

	bench.ref("Emit event without subscribers", () => {
		return broker.emit("event", ["param1", { a: 1, b: "Teszt"}, 500]);
	});

})();

(function() {
	// Create broker
	let broker = new ServiceBroker({ logger: false });

	broker.createService({
		name: "handler",
		events: {
			"event"(p) {
				return p;
			}
		}
	});

	bench.add("Emit simple event to 1 subscribers", () => {
		return broker.emit("event", ["param1", { a: 1, b: "Teszt"}, 500]);
	});

})();

(function() {
	// Create broker
	let broker = new ServiceBroker({ logger: false });

	for (let i = 0; i < 20; i++)
		broker.createService({
			name: `handler-${i}`,
			events: {
				"event"(p) {
					return p;
				}
			}
		});

	bench.add("Emit simple event to 20 subscribers", () => {
		return broker.emit("event", ["param1", { a: 1, b: "Teszt"}, 500]);
	});

})();

(function() {
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
		return broker.emit("event.target", ["param1", { a: 1, b: "Teszt"}, 500]);
	});

})();

(function() {
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

(function() {
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
		return broker.emit("event.target.name", ["param1", { a: 1, b: "Teszt"}, 500]);
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
   Node.JS: 8.9.4
   V8: 6.1.534.50
   Intel(R) Core(TM) i7-4770K CPU @ 3.50GHz × 8

Suite: Emit event
√ Emit event without subscribers                                     7,450,694 rps
√ Emit simple event to 1 subscribers                                   663,669 rps
√ Emit simple event to 20 subscribers                                   41,231 rps
√ Emit wildcard event to 20 subscribers                                 30,902 rps
√ Emit multi-wildcard event to 20 subscribers without params            30,608 rps
√ Emit multi-wildcard event to 20 subscribers with params               30,355 rps

   Emit event without subscribers (#)                                    0%      (7,450,694 rps)   (avg: 134ns)
   Emit simple event to 1 subscribers                               -91.09%        (663,669 rps)   (avg: 1μs)
   Emit simple event to 20 subscribers                              -99.45%         (41,231 rps)   (avg: 24μs)
   Emit wildcard event to 20 subscribers                            -99.59%         (30,902 rps)   (avg: 32μs)
   Emit multi-wildcard event to 20 subscribers without params       -99.59%         (30,608 rps)   (avg: 32μs)
   Emit multi-wildcard event to 20 subscribers with params          -99.59%         (30,355 rps)   (avg: 32μs)
-----------------------------------------------------------------------

*/
