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
   Node.JS: 6.10.0
   V8: 5.1.281.93
   Intel(R) Core(TM) i7-4770K CPU @ 3.50GHz × 8

Suite: Call methods
√ broker.call (normal)*             1,239,453 rps
√ broker.call (with params)*        1,181,153 rps

   broker.call (normal)* (#)            0%      (1,239,453 rps)   (avg: 806ns)
   broker.call (with params)*        -4.7%      (1,181,153 rps)   (avg: 846ns)
-----------------------------------------------------------------------

Suite: Call with middlewares
√ Call without middlewares*        1,200,847 rps
√ Call with 1 middleware*          1,195,808 rps
√ Call with 5 middlewares*         1,195,328 rps

   Call without middlewares* (#)       0%      (1,200,847 rps)   (avg: 832ns)
   Call with 1 middleware*         -0.42%      (1,195,808 rps)   (avg: 836ns)
   Call with 5 middlewares*        -0.46%      (1,195,328 rps)   (avg: 836ns)
-----------------------------------------------------------------------

Suite: Call with cachers
√ No cacher*                              984,530 rps
√ Built-in cacher*                        206,642 rps
√ Built-in cacher (keys filter)*          367,210 rps

   No cacher* (#)                           0%        (984,530 rps)   (avg: 1μs)
   Built-in cacher*                    -79.01%        (206,642 rps)   (avg: 4μs)
   Built-in cacher (keys filter)*       -62.7%        (367,210 rps)   (avg: 2μs)
-----------------------------------------------------------------------

Suite: Call with param validator
√ No validator*                   975,769 rps
√ With validator passes*          858,968 rps
√ With validator fail*             56,250 rps

   No validator* (#)                0%        (975,769 rps)   (avg: 1μs)
   With validator passes*      -11.97%        (858,968 rps)   (avg: 1μs)
   With validator fail*        -94.24%         (56,250 rps)   (avg: 17μs)
-----------------------------------------------------------------------

Suite: Call with statistics & metrics
√ No statistics*                    1,170,614 rps
√ With metrics*                       337,038 rps
√ With statistics*                  1,190,222 rps
√ With metrics & statistics*          306,707 rps

   No statistics* (#)                   0%      (1,170,614 rps)   (avg: 854ns)
   With metrics*                   -71.21%        (337,038 rps)   (avg: 2μs)
   With statistics*                 +1.68%      (1,190,222 rps)   (avg: 840ns)
   With metrics & statistics*       -73.8%        (306,707 rps)   (avg: 3μs)
-----------------------------------------------------------------------

*/