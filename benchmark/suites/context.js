"use strict";

let Promise	= require("bluebird");

let Benchmarkify = require("benchmarkify");
Benchmarkify.printHeader("Context benchmark");

let ServiceBroker = require("../../src/service-broker");
let Context = require("../../src/context");

let broker = new ServiceBroker();
broker.loadService(__dirname + "/../user.service");

let bench1 = new Benchmarkify({ async: false, name: "Context constructor"});
(function() {
	let action = {
		name: "users.find",
		handler: () => {},
	};
	//let params = bench1.getDataFile("150.json");
	let params = { limit: 100, offset: 50, sort: "name created" };

	// ----
	bench1.add("create without settings", () => {
		return new Context();
	});

	bench1.add("create with settings", () => {
		return new Context({
			broker,
			action
		});
	});

	bench1.add("create with params", () => {
		return new Context({
			broker,
			action,
			params
		});
	});

	let ctx = new Context();
	bench1.add("create subContext", () => {
		return ctx.createSubContext(action, params);
	});
})();

// ----------------------------
let bench2 = new Benchmarkify({ async: true, name: "Context.invoke with sync handler"});
(function() {


	let actions = broker.actions.get("users.find");
	let action = actions.get().data;
	let handler = () => {
		return [1,2,3];
	};

	let ctx = new Context({ broker, action });
	// ----

	bench2.add("call direct without invoke", () => {
		return Promise.resolve(handler(ctx));
	});

	bench2.add("call invoke", () => {
		return ctx.invoke(() => handler(ctx));
	});

})();

// ----------------------------
let bench3 = new Benchmarkify({ async: true, name: "Context.invoke with async handler"});
(function() {


	let actions = broker.actions.get("users.find");
	let action = actions.get().data;
	let handler = () => {
		return new Promise((resolve) => {
			resolve([1, 2, 3]);
		});
	};

	let ctx = new Context({ broker, action });
	// ----

	bench3.add("call direct without invoke", () => {
		return handler(ctx);
	});

	bench3.add("call invoke", () => {
		return ctx.invoke(() => handler(ctx));
	});

})();

bench1.run()
.then(() => bench2.run())
.then(() => bench3.run());
