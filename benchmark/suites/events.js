"use strict";

let Benchmarkify = require("benchmarkify");
Benchmarkify.printHeader("Event benchmark");

let ServiceBroker = require("../../src/service-broker");

let bench = new Benchmarkify({ async: false, name: "Emit event"});

(function() {
	// Create broker
	let broker = new ServiceBroker();

	bench.add("Emit event without subscribers", () => {
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
   Node.JS: 6.9.2
   V8: 5.1.281.88
   Intel(R) Core(TM) i7-4770K CPU @ 3.50GHz × 8

Suite: Emit event
√ Emit event without subscribers x 3,607,404 ops/sec ±1.33% (95 runs sampled)
√ Emit simple event to 20 subscribers x 1,042,061 ops/sec ±0.68% (96 runs sampled)
√ Emit wildcard event to 20 subscribers x 926,319 ops/sec ±0.74% (92 runs sampled)
√ Emit multi-wildcard event to 20 subscribers without params x 882,441 ops/sec ±0.71% (94 runs sampled)
√ Emit multi-wildcard event to 20 subscribers with params x 873,982 ops/sec ±0.66% (96 runs sampled)

   Emit event without subscribers                                 0.00%   (3,607,404 ops/sec)
   Emit simple event to 20 subscribers                          -71.11%   (1,042,061 ops/sec)
   Emit wildcard event to 20 subscribers                        -74.32%    (926,319 ops/sec)
   Emit multi-wildcard event to 20 subscribers without params   -75.54%    (882,441 ops/sec)
   Emit multi-wildcard event to 20 subscribers with params      -75.77%    (873,982 ops/sec)
-----------------------------------------------------------------------

*/