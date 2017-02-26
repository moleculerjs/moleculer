"use strict";

//let _ = require("lodash");
let Promise	= require("bluebird");

let Benchmarkify = require("benchmarkify");
Benchmarkify.printHeader("Broker call benchmarks");

let ServiceBroker = require("../../src/service-broker");
let Context = require("../../src/context");
let userService;

function createBroker(opts) {
	// Create broker
	let broker = new ServiceBroker(opts);

	let service = broker.loadService(__dirname + "/../user.service");

	// Load user service
	if (userService == null)
		userService = service;

	broker.start();
	return broker;
}

let bench1 = new Benchmarkify({ async: true, name: "Call methods"});
(function() {
	let broker = createBroker();
	/*bench1.add("Direct service call", () => {
		return userService.actions.empty();
	});

	let action = null;
	let ctx = null;
	bench1.add("action.handler", () => {
		//if (action == null) {
			let actions = broker.actions.get("users.empty");
			action = actions.getData();
		//}
		if (ctx == null) 
			ctx = new Context({ broker, action});

		return Promise.resolve(action.handler(ctx));
	});

	bench1.add("ctx.invoke", () => {
		let actions = broker.actions.get("users.empty");
		let action = actions.get().data;
		let ctx = new Context({ broker, action});
		return ctx.invoke(action.handler);
	});*/

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

	let mw1 = handler => {
		return ctx => ctx.after(handler(ctx), res => res);
	};
	broker.use(mw1);

	bench2.add("Call with 1 middleware", () => {
		return broker.call("users.empty");
	});
})();

(function() {
	let broker = createBroker();

	let mw1 = handler => {
		return ctx => ctx.after(handler(ctx), res => res);
	};
	broker.use(mw1, mw1, mw1, mw1, mw1);

	bench2.add("Call with 5 middlewares", () => {
		return broker.call("users.empty");
	});
})();

// ----------------------------------------------------------------
let bench3 = new Benchmarkify({ async: true, name: "Call with cachers"});

let MemoryCacher = require("../../src/cachers").Memory;

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

// ----------------------------------------------------------------
let bench5 = new Benchmarkify({ async: true, name: "Call with statistics & metrics"});

(function() {
	let broker = createBroker();
	bench5.add("No statistics", () => {
		return broker.call("users.empty");
	});
})();

(function() {
	let broker = createBroker({ metrics: true });
	bench5.add("With metrics", () => {
		return broker.call("users.empty");
	});
})();

(function() {
	let broker = createBroker({ statistics: true });
	bench5.add("With statistics", () => {
		return broker.call("users.empty");
	});
})();

(function() {
	let broker = createBroker({ metrics: true, statistics: true });
	bench5.add("With metrics & statistics", () => {
		return broker.call("users.empty");
	});
})();

bench1.run()
.then(() => bench2.skip())
.then(() => bench3.skip())
.then(() => bench4.skip())
.then(() => bench5.skip());


/*

==========================
  Broker call benchmarks
==========================

Platform info:
==============
   Windows_NT 6.1.7601 x64
   Node.JS: 6.10.0
   V8: 5.1.281.93
   Intel(R) Core(TM) i7-4770K CPU @ 3.50GHz × 8

Suite: Call methods
√ Direct service call x 598,287 ops/sec ±0.72% (83 runs sampled)
√ action.handler x 857,459 ops/sec ±0.42% (86 runs sampled)
√ ctx.invoke x 563,193 ops/sec ±0.82% (87 runs sampled)
√ broker.call (normal) x 530,562 ops/sec ±1.15% (83 runs sampled)
√ broker.call (with params) x 533,886 ops/sec ±0.67% (87 runs sampled)

   Direct service call         -30.23%    (598,287 ops/sec)
   action.handler                0.00%    (857,459 ops/sec)
   ctx.invoke                  -34.32%    (563,193 ops/sec)
   broker.call (normal)        -38.12%    (530,562 ops/sec)
   broker.call (with params)   -37.74%    (533,886 ops/sec)
-----------------------------------------------------------------------

Suite: Call with middlewares
√ Call without middlewares x 531,402 ops/sec ±0.91% (88 runs sampled)
√ Call with 1 middleware x 531,329 ops/sec ±2.01% (87 runs sampled)
√ Call with 5 middlewares x 537,754 ops/sec ±0.98% (90 runs sampled)

   Call without middlewares    -1.18%    (531,402 ops/sec)
   Call with 1 middleware      -1.19%    (531,329 ops/sec)
   Call with 5 middlewares      0.00%    (537,754 ops/sec)
-----------------------------------------------------------------------

Suite: Call with cachers
√ No cacher x 441,422 ops/sec ±1.39% (87 runs sampled)
√ Built-in cacher x 105,621 ops/sec ±0.99% (83 runs sampled)
√ Built-in cacher (keys filter) x 202,384 ops/sec ±0.78% (88 runs sampled)

   No cacher                         0.00%    (441,422 ops/sec)
   Built-in cacher                 -76.07%    (105,621 ops/sec)
   Built-in cacher (keys filter)   -54.15%    (202,384 ops/sec)
-----------------------------------------------------------------------

Suite: Call with param validator
√ No validator x 435,510 ops/sec ±1.47% (87 runs sampled)
√ With validator passes x 93,460 ops/sec ±0.96% (87 runs sampled)
√ With validator fail x 18,570 ops/sec ±1.35% (85 runs sampled)

   No validator              0.00%    (435,510 ops/sec)
   With validator passes   -78.54%     (93,460 ops/sec)
   With validator fail     -95.74%     (18,570 ops/sec)
-----------------------------------------------------------------------

Suite: Call with statistics & metrics
√ No statistics x 524,523 ops/sec ±0.90% (81 runs sampled)
√ With metrics x 280,352 ops/sec ±1.41% (86 runs sampled)
√ With statistics x 319,233 ops/sec ±1.95% (81 runs sampled)
√ With metrics & statistics x 192,269 ops/sec ±3.09% (61 runs sampled)

   No statistics                 0.00%    (524,523 ops/sec)
   With metrics                -46.55%    (280,352 ops/sec)
   With statistics             -39.14%    (319,233 ops/sec)
   With metrics & statistics   -63.34%    (192,269 ops/sec)
-----------------------------------------------------------------------

*/