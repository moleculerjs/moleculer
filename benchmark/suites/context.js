"use strict";

let Benchmarker = require("../benchmarker");
Benchmarker.printHeader("Context benchmark");

let ServiceBroker = require("../../src/service-broker");
let Context = require("../../src/context");

let broker = new ServiceBroker();
broker.loadService(__dirname + "/../user.service");

(function() {
	let action = {
		name: "users.find",
		handler: () => {},
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

	// bench.run();
})();

// ----------------------------
(function() {

	let bench = new Benchmarker({ async: true, name: "Context.invoke sync benchmark"});

	let actions = broker.actions.get("users.find");
	let action = actions.get().data;
	let handler = () => {
		return [1,2,3];
	};

	let ctx = new Context({ broker, action });
	// ----

	bench.add("call direct without invoke", () => {
		return Promise.resolve(handler(ctx));
	});

	bench.add("call invoke", () => {
		return ctx.invoke(() => handler(ctx));
	});

	bench.add("call invokeOld", () => {
		return ctx.invokeOld(handler);
	});

	bench.run();

})();

// ----------------------------
(function() {

	let bench = new Benchmarker({ async: true, name: "Context.invoke async benchmark"});

	let actions = broker.actions.get("users.find");
	let action = actions.get().data;
	let handler = () => {
		return new Promise((resolve) => {
			resolve([1, 2, 3]);
		});
	};

	let ctx = new Context({ broker, action });
	// ----

	bench.add("call direct without invoke", () => {
		return handler(ctx);
	});

	bench.add("call invoke", () => {
		return ctx.invoke(() => handler(ctx));
	});

	bench.add("call invokeOld", () => {
		return ctx.invokeOld(() => handler(ctx));
	});

	// bench.run();

})();