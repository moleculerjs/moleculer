"use strict";

let Benchmarkify = require("benchmarkify");
let benchmark = new Benchmarkify("Event benchmark").printHeader();

let ServiceBroker = require("../../src/service-broker");

let bench = benchmark.createSuite("Emit event");

(function() {
	// Create broker
	let broker = new ServiceBroker();

	bench.ref("Emit event without subscribers", () => {
		return broker.emit("event", ["param1", { a: 1, b: "Teszt"}, 500]);
	});

})();

(function() {
	// Create broker
	let broker = new ServiceBroker();

	broker.on("event", p => p);

	bench.add("Emit simple event to 1 subscribers", () => {
		return broker.emit("event", ["param1", { a: 1, b: "Teszt"}, 500]);
	});

})();

(function() {
	// Create broker
	let broker = new ServiceBroker();

	for(let i = 0; i < 20; i++) 
		broker.on("event", p => p);

	bench.add("Emit simple event to 20 subscribers", () => {
		return broker.emit("event", ["param1", { a: 1, b: "Teszt"}, 500]);
	});

})();

(function() {
	// Create broker
	let broker = new ServiceBroker();

	for(let i = 0; i < 20; i++) 
		broker.on("event.*", p => p);

	bench.add("Emit wildcard event to 20 subscribers", () => {
		return broker.emit("event.target", ["param1", { a: 1, b: "Teszt"}, 500]);
	});

})();

(function() {
	// Create broker
	let broker = new ServiceBroker();

	for(let i = 0; i < 20; i++) 
		broker.on("event.**", p => p);

	bench.add("Emit multi-wildcard event to 20 subscribers without params", () => {
		return broker.emit("event.target.name");
	});

})();

(function() {
	// Create broker
	let broker = new ServiceBroker();

	for(let i = 0; i < 20; i++) 
		broker.on("event.**", p => p);

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
   Node.JS: 6.10.0
   V8: 5.1.281.93
   Intel(R) Core(TM) i7-4770K CPU @ 3.50GHz × 8

Suite: Emit event
√ Emit event without subscribers                                     2,161,567 rps
√ Emit simple event to 1 subscribers                                 1,785,380 rps
√ Emit simple event to 20 subscribers                                1,076,511 rps
√ Emit wildcard event to 20 subscribers                                977,945 rps
√ Emit multi-wildcard event to 20 subscribers without params           894,379 rps
√ Emit multi-wildcard event to 20 subscribers with params              880,544 rps

   Emit event without subscribers (#)                                    0%      (2,161,567 rps)   (avg: 462ns)
   Emit simple event to 1 subscribers                                -17.4%      (1,785,380 rps)   (avg: 560ns)
   Emit simple event to 20 subscribers                               -50.2%      (1,076,511 rps)   (avg: 928ns)
   Emit wildcard event to 20 subscribers                            -54.76%        (977,945 rps)   (avg: 1μs)
   Emit multi-wildcard event to 20 subscribers without params       -58.62%        (894,379 rps)   (avg: 1μs)
   Emit multi-wildcard event to 20 subscribers with params          -59.26%        (880,544 rps)   (avg: 1μs)
-----------------------------------------------------------------------

*/