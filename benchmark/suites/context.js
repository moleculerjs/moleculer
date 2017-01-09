"use strict";

let Benchmarker = require("../benchmarker");
Benchmarker.printHeader("Context benchmark");

let ServiceBroker = require("../../src/service-broker");
let Context = require("../../src/context");

let broker = new ServiceBroker();
let action = {
	name: "users.find"
};

let bench = new Benchmarker({ async: false, name: "Create context benchmark"});
let params = bench.getDataFile("150.json");

// ----
bench.add("create without settings", () => {
	return new Context();
});

bench.add("create with settings", () => {
	return new Context({
		broker,
		action
	});
});

bench.add("create with params", () => {
	return new Context({
		broker,
		action,
		params
	});
});

let ctx = new Context();
bench.add("create subContext", () => {
	return ctx.createSubContext(action, params);
});

bench.run();