"use strict";

let Benchmarker = require("../benchmarker");
Benchmarker.printHeader("Event benchmark");

let ServiceBroker = require("../../src/service-broker");

let bench = new Benchmarker({ async: false, name: "Emit event"});

(function() {
	// Create broker
	let broker = new ServiceBroker();

	bench.add("Emit event without subscribers", () => {
		return broker.emit("event");
	});

})();

(function() {
	// Create broker
	let broker = new ServiceBroker();

	for(let i = 0; i < 20; i++) 
		broker.on("event", () => {});

	bench.add("Emit simple event to 20 subscribers", () => {
		return broker.emit("event");
	});

})();

(function() {
	// Create broker
	let broker = new ServiceBroker();

	for(let i = 0; i < 20; i++) 
		broker.on("event.*", () => {});

	bench.add("Emit wildcard event to 20 subscribers", () => {
		return broker.emit("event.target");
	});

})();

(function() {
	// Create broker
	let broker = new ServiceBroker();

	for(let i = 0; i < 20; i++) 
		broker.on("event.**", () => {});

	bench.add("Emit multi-wildcard event to 20 subscribers", () => {
		return broker.emit("event.target.name");
	});

})();

bench.run();
