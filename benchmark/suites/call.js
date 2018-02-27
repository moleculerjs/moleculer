"use strict";

//let _ = require("lodash");
let Promise	= require("bluebird");

let Benchmarkify = require("benchmarkify");
let benchmark = new Benchmarkify("Broker call benchmarks").printHeader();

let ServiceBroker = require("../../src/service-broker");

function createBroker(opts) {
	// Create broker
	let broker = new ServiceBroker(opts);

	broker.loadService(__dirname + "/../user.service");

	broker.start();
	return broker;
}

let bench1 = benchmark.createSuite("Call methods");
(function() {
	let broker = createBroker();

	bench1.ref("broker.call (normal)", done => {
		broker.call("users.empty").then(done);
	});

	bench1.add("broker.call (with params)", done => {
		broker.call("users.empty", { id: 5, sort: "name created", limit: 10 }).then(done);
	});

})();

// ----------------------------------------------------------------
let bench2 = benchmark.createSuite("Call with middlewares");

(function() {
	let broker = createBroker();
	bench2.ref("Call without middlewares", done => {
		return broker.call("users.empty").then(done);
	});
})();

(function() {
	let broker = createBroker();

	let mw1 = handler => {
		return ctx => handler(ctx).then(res => res);
	};
	broker.use(mw1);

	bench2.add("Call with 1 middleware", done => {
		return broker.call("users.empty").then(done);
	});
})();

(function() {
	let broker = createBroker();

	let mw1 = handler => {
		return ctx => handler(ctx).then(res => res);
	};
	broker.use(mw1, mw1, mw1, mw1, mw1);

	bench2.add("Call with 5 middlewares", done => {
		return broker.call("users.empty").then(done);
	});
})();

// ----------------------------------------------------------------
let bench3 = benchmark.createSuite("Call with cachers");

let MemoryCacher = require("../../src/cachers").Memory;

(function() {
	let broker = createBroker();
	bench3.ref("No cacher", done => {
		return broker.call("users.get", { id: 5 }).then(done);
	});
})();

(function() {
	let broker = createBroker({ cacher: new MemoryCacher() });
	bench3.add("Built-in cacher", done => {
		return broker.call("users.get", { id: 5 }).then(done);
	});
})();

(function() {
	let broker = createBroker({ cacher: new MemoryCacher() });
	bench3.add("Built-in cacher (keys filter)", done => {
		return broker.call("users.get2", { id: 5 }).then(done);
	});
})();

// ----------------------------------------------------------------
let bench4 = benchmark.createSuite("Call with param validator");

(function() {
	let broker = createBroker();
	bench4.ref("No validator", done => {
		return broker.call("users.get", { id: 5 }).then(done);
	});
})();

(function() {
	let broker = createBroker();
	bench4.add("With validator passes", done => {
		return broker.call("users.validate", { id: 5 }).then(done);
	});
})();

(function() {
	let broker = createBroker();
	bench4.add("With validator fail", done => {
		return broker.call("users.validate", { id: "a5" })
			.catch(done);
	});
})();

// ----------------------------------------------------------------
let bench5 = benchmark.createSuite("Call with statistics & metrics");

(function() {
	let broker = createBroker();
	bench5.ref("No statistics", done => {
		return broker.call("users.empty").then(done);
	});
})();

(function() {
	let broker = createBroker({ metrics: true });
	bench5.add("With metrics", done => {
		return broker.call("users.empty").then(done);
	});
})();

(function() {
	let broker = createBroker({ statistics: true });
	bench3.add("With statistics", done => {
		return broker.call("users.empty").then(done);
	});
})();

(function() {
	let broker = createBroker({ metrics: true, statistics: true });
	bench5.add("With metrics & statistics", done => {
		return broker.call("users.empty").then(done);
	});
})();

benchmark.run([bench1, bench2, bench3, bench4, bench5]);

/*

==========================
  Broker call benchmarks
==========================

Platform info:
==============
   Windows_NT 6.1.7601 x64
   Node.JS: 8.9.4
   V8: 6.1.534.50
   Intel(R) Core(TM) i7-4770K CPU @ 3.50GHz × 8

Suite: Call methods
√ broker.call (normal)*             1,738,486 rps
√ broker.call (with params)*        1,807,759 rps

   broker.call (normal)* (#)            0%      (1,738,486 rps)   (avg: 575ns)
   broker.call (with params)*       +3.98%      (1,807,759 rps)   (avg: 553ns)
-----------------------------------------------------------------------

Suite: Call with middlewares
√ Call without middlewares*        1,716,913 rps
√ Call with 1 middleware*          1,662,845 rps
√ Call with 5 middlewares*         1,666,777 rps

   Call without middlewares* (#)       0%      (1,716,913 rps)   (avg: 582ns)
   Call with 1 middleware*         -3.15%      (1,662,845 rps)   (avg: 601ns)
   Call with 5 middlewares*        -2.92%      (1,666,777 rps)   (avg: 599ns)
-----------------------------------------------------------------------

Suite: Call with cachers
√ No cacher*                            1,344,920 rps
√ Built-in cacher*                        315,524 rps
√ Built-in cacher (keys filter)*          964,395 rps
√ With statistics*                        811,574 rps

   No cacher* (#)                           0%      (1,344,920 rps)   (avg: 743ns)
   Built-in cacher*                    -76.54%        (315,524 rps)   (avg: 3μs)
   Built-in cacher (keys filter)*      -28.29%        (964,395 rps)   (avg: 1μs)
   With statistics*                    -39.66%        (811,574 rps)   (avg: 1μs)
-----------------------------------------------------------------------

Suite: Call with param validator
√ No validator*                 1,055,690 rps
√ With validator passes*        1,082,886 rps
√ With validator fail*              6,994 rps

   No validator* (#)                0%      (1,055,690 rps)   (avg: 947ns)
   With validator passes*       +2.58%      (1,082,886 rps)   (avg: 923ns)
   With validator fail*        -99.34%          (6,994 rps)   (avg: 142μs)
-----------------------------------------------------------------------

Suite: Call with statistics & metrics
√ No statistics*                    1,311,912 rps
√ With metrics*                       453,033 rps
√ With metrics & statistics*          396,287 rps

   No statistics* (#)                   0%      (1,311,912 rps)   (avg: 762ns)
   With metrics*                   -65.47%        (453,033 rps)   (avg: 2μs)
   With metrics & statistics*      -69.79%        (396,287 rps)   (avg: 2μs)
-----------------------------------------------------------------------

*/
