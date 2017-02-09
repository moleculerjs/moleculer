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
