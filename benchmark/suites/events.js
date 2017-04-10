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
√ Emit event without subscribers x 3,654,151 ops/sec ±1.53% (94 runs sampled)
√ Emit simple event to 20 subscribers x 1,043,375 ops/sec ±0.99% (92 runs sampled)
√ Emit wildcard event to 20 subscribers x 945,761 ops/sec ±0.64% (93 runs sampled)
√ Emit multi-wildcard event to 20 subscribers without params x 855,044 ops/sec ±0.69% (95 runs sampled)
√ Emit multi-wildcard event to 20 subscribers with params x 853,537 ops/sec ±0.65% (95 runs sampled)

   Emit event without subscribers                                 0.00%   (3,654,151 ops/sec)
   Emit simple event to 20 subscribers                          -71.45%   (1,043,375 ops/sec)
   Emit wildcard event to 20 subscribers                        -74.12%    (945,761 ops/sec)
   Emit multi-wildcard event to 20 subscribers without params   -76.60%    (855,044 ops/sec)
   Emit multi-wildcard event to 20 subscribers with params      -76.64%    (853,537 ops/sec)
-----------------------------------------------------------------------

*/