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
	Reference values

==========================
  Broker call benchmarks
==========================

Platform info:
==============
   Windows_NT 6.1.7601 x64
   Node.JS: 6.9.2
   V8: 5.1.281.88
   Intel(R) Core(TM) i7-4770K CPU @ 3.50GHz × 8

Suite: Call methods
√ Direct service call x 583,679 ops/sec ±0.84% (87 runs sampled)
√ action.handler x 342,408 ops/sec ±0.35% (86 runs sampled)
√ ctx.invoke x 299,400 ops/sec ±0.25% (87 runs sampled)
√ broker.call (normal) x 262,532 ops/sec ±0.91% (85 runs sampled)
√ broker.call (with params) x 203,288 ops/sec ±1.49% (86 runs sampled)

   Direct service call           0.00%    (583,679 ops/sec)
   action.handler              -41.34%    (342,408 ops/sec)
   ctx.invoke                  -48.70%    (299,400 ops/sec)
   broker.call (normal)        -55.02%    (262,532 ops/sec)
   broker.call (with params)   -65.17%    (203,288 ops/sec)
-----------------------------------------------------------------------

Suite: Call with middlewares
√ Call without middlewares x 296,245 ops/sec ±1.00% (87 runs sampled)
√ Call with 1 middleware x 205,757 ops/sec ±0.84% (84 runs sampled)
√ Call with 5 middlewares x 175,706 ops/sec ±0.77% (86 runs sampled)

   Call without middlewares     0.00%    (296,245 ops/sec)
   Call with 1 middleware     -30.54%    (205,757 ops/sec)
   Call with 5 middlewares    -40.69%    (175,706 ops/sec)
-----------------------------------------------------------------------

Suite: Call with cachers
√ No cacher x 181,782 ops/sec ±1.13% (89 runs sampled)
√ Built-in cacher x 65,153 ops/sec ±0.74% (87 runs sampled)
√ Built-in cacher (keys filter) x 89,413 ops/sec ±0.83% (86 runs sampled)
√ Middleware cacher x 55,845 ops/sec ±1.35% (89 runs sampled)
√ Middleware cacher (keys filter) x 73,917 ops/sec ±0.72% (88 runs sampled)

   No cacher                           0.00%    (181,782 ops/sec)
   Built-in cacher                   -64.16%     (65,153 ops/sec)
   Built-in cacher (keys filter)     -50.81%     (89,413 ops/sec)
   Middleware cacher                 -69.28%     (55,845 ops/sec)
   Middleware cacher (keys filter)   -59.34%     (73,917 ops/sec)
-----------------------------------------------------------------------

Suite: Call with param validator
√ No validator x 181,817 ops/sec ±1.00% (88 runs sampled)
√ With validator passes x 59,041 ops/sec ±1.21% (83 runs sampled)
√ With validator fail x 15,344 ops/sec ±1.09% (87 runs sampled)

   No validator              0.00%    (181,817 ops/sec)
   With validator passes   -67.53%     (59,041 ops/sec)
   With validator fail     -91.56%     (15,344 ops/sec)
-----------------------------------------------------------------------	


 */

/*
	Benti gépen

==========================
  Broker call benchmarks
==========================

Platform info:
==============
   Windows_NT 6.1.7601 x64
   Node.JS: 6.9.5
   V8: 5.1.281.89
   Intel(R) Core(TM) i5-2400 CPU @ 3.10GHz × 4

Suite: Call methods
√ Direct service call x 364,501 ops/sec ±0.80% (83 runs sampled)
√ action.handler x 146,455 ops/sec ±0.36% (83 runs sampled)
√ ctx.invoke x 116,559 ops/sec ±0.23% (83 runs sampled)
√ broker.call (normal) x 108,492 ops/sec ±1.10% (85 runs sampled)
√ broker.call (with params) x 80,753 ops/sec ±1.65% (80 runs sampled)

   Direct service call           0.00%    (364,501 ops/sec)
   action.handler              -59.82%    (146,455 ops/sec)
   ctx.invoke                  -68.02%    (116,559 ops/sec)
   broker.call (normal)        -70.24%    (108,492 ops/sec)
   broker.call (with params)   -77.85%     (80,753 ops/sec)
-----------------------------------------------------------------------

Suite: Call with middlewares
√ Call without middlewares x 111,265 ops/sec ±1.18% (82 runs sampled)
√ Call with 1 middleware x 111,179 ops/sec ±1.04% (82 runs sampled)
√ Call with 5 middlewares x 110,568 ops/sec ±1.56% (83 runs sampled)

   Call without middlewares     0.08%    (111,265 ops/sec)
   Call with 1 middleware       0.00%    (111,179 ops/sec)
   Call with 5 middlewares     -0.55%    (110,568 ops/sec)
-----------------------------------------------------------------------

Suite: Call with cachers
√ No cacher x 72,112 ops/sec ±1.25% (85 runs sampled)
√ Built-in cacher x 31,140 ops/sec ±1.03% (83 runs sampled)
√ Built-in cacher (keys filter) x 47,346 ops/sec ±1.57% (86 runs sampled)

   No cacher                         0.00%     (72,112 ops/sec)
   Built-in cacher                 -56.82%     (31,140 ops/sec)
   Built-in cacher (keys filter)   -34.34%     (47,346 ops/sec)
-----------------------------------------------------------------------

Suite: Call with param validator
√ No validator x 73,113 ops/sec ±1.15% (84 runs sampled)
√ With validator passes x 25,940 ops/sec ±1.37% (82 runs sampled)
√ With validator fail x 8,952 ops/sec ±1.76% (81 runs sampled)

   No validator              0.00%     (73,113 ops/sec)
   With validator passes   -64.52%     (25,940 ops/sec)
   With validator fail     -87.76%      (8,952 ops/sec)
-----------------------------------------------------------------------

Suite: Call with statistics & metrics
√ No statistics x 104,076 ops/sec ±1.61% (86 runs sampled)
√ With metrics x 73,415 ops/sec ±1.76% (80 runs sampled)
√ With statistics x 78,709 ops/sec ±1.96% (77 runs sampled)
√ With metrics & statistics x 67,187 ops/sec ±0.76% (73 runs sampled)

   No statistics                 0.00%    (104,076 ops/sec)
   With metrics                -29.46%     (73,415 ops/sec)
   With statistics             -24.37%     (78,709 ops/sec)
   With metrics & statistics   -35.44%     (67,187 ops/sec)
-----------------------------------------------------------------------


*/