"use strict";

let _ = require("lodash");
let Promise	= require("bluebird");

let Benchmarkify = require("benchmarkify");
Benchmarkify.printHeader("Broker call benchmarks");

let ServiceBroker = require("../../src/service-broker");
let Context = require("../../src/context");
let userService;

function createBroker(opts) {
	// Create broker
	let broker = new ServiceBroker(opts);

	// Load user service
	userService = broker.loadService(__dirname + "/../user.service");

	broker.start();
	return broker;
}

let bench1 = new Benchmarkify({ async: true, name: "Call methods"});
(function() {
	let broker = createBroker();
	bench1.add("Direct service call", () => {
		return userService.actions.empty();
	});

	bench1.add("action.handler", () => {
		let actions = broker.actions.get("users.empty");
		let action = actions.get().data;
		let ctx = new Context({ broker, action});
		return Promise.resolve(action.handler(ctx));
	});

	bench1.add("ctx.invoke", () => {
		let actions = broker.actions.get("users.empty");
		let action = actions.get().data;
		let ctx = new Context({ broker, action});
		return ctx.invoke(action.handler);
	});

	bench1.add("broker.call (normal)", () => {
		return broker.call("users.empty");
	});

	bench1.add("broker.call (with params)", () => {
		return broker.call("users.empty", { id: 5, sort: "name created", limit: 10 });
	});

})();

// ----------------------------------------------------------------
let bench2 = new Benchmarkify({ async: true, name: "Call with middlewares"});

(function() {
	let broker = createBroker();
	bench2.add("Call without middlewares", () => {
		return broker.call("users.empty");
	});
})();

(function() {
	let broker = createBroker();

	let mw1 = (ctx, next) => next();
	broker.use(mw1);

	bench2.add("Call with 1 middleware", () => {
		return broker.call("users.empty");
	});
})();

(function() {
	let broker = createBroker();

	let mw1 = (ctx, next) => next();
	broker.use(mw1, mw1, mw1, mw1, mw1);

	bench2.add("Call with 5 middlewares", () => {
		return broker.call("users.empty");
	});
})();

// ----------------------------------------------------------------
let bench3 = new Benchmarkify({ async: true, name: "Call with cachers"});

let MemoryCacher = require("../../src/cachers").Memory;
let cache = require("../../src/middlewares/cache");

(function() {
	let broker = createBroker();
	bench3.add("No cacher", () => {
		return broker.call("users.get", { id: 5 });
	});
})();

(function() {
	let broker = createBroker({ cacher: new MemoryCacher() });
	bench3.add("Built-in cacher", () => {
		return broker.call("users.get", { id: 5 });
	});
})();

(function() {
	let broker = createBroker({ cacher: new MemoryCacher() });
	bench3.add("Built-in cacher (keys filter)", () => {
		return broker.call("users.get2", { id: 5 });
	});
})();

(function() {
	let broker = createBroker();
	broker.use(cache(broker, new MemoryCacher()));

	bench3.add("Middleware cacher", () => {
		return broker.call("users.get", { id: 5 });
	});
})();

(function() {
	let broker = createBroker();
	broker.use(cache(broker, new MemoryCacher()));

	bench3.add("Middleware cacher (keys filter)", () => {
		return broker.call("users.get2", { id: 5 });
	});
})();

// ----------------------------------------------------------------
let bench4 = new Benchmarkify({ async: true, name: "Call with param validator"});

(function() {
	let broker = createBroker();
	bench4.add("No validator", () => {
		return broker.call("users.get", { id: 5 });
	});
})();

(function() {
	let broker = createBroker();
	bench4.add("With validator passes", () => {
		return broker.call("users.validate", { id: 5 });
	});
})();

(function() {
	let broker = createBroker();
	bench4.add("With validator fail", () => {
		return broker.call("users.validate", { id: "a5" })
			.catch(err => null);
	});
})();

bench1.run()
.then(() => bench2.skip())
.then(() => bench3.skip())
.then(() => bench4.skip());
