"use strict";

let _ = require("lodash");
let Promise	= require("bluebird");

let Benchmarker = require("../benchmarker");
Benchmarker.printHeader("Call method benchmark");

let ServiceBroker = require("../../src/service-broker");
let Context = require("../../src/context");

// Create broker
let broker = new ServiceBroker();

// Load broker actions map with fake keys
for(let i = 0; i < 500; i++) 
	broker.actions.set("users." + (Math.random()*1e32).toString(36), {});

// Load user service
let userService = broker.loadService(__dirname + "/../user.service");

broker.start();

let bench = new Benchmarker({ async: true, name: "Call methods"});

bench.add("Direct service call", () => {
	return userService.actions.empty();
});

bench.add("Manually call action via ctx.invoke", () => {
	let actions = broker.actions.get("users.empty");
	let action = actions.get().data;
	let ctx = new Context({ broker, action});
	return ctx.invoke(action.handler);
});

bench.add("Manually call action.handler", () => {
	let actions = broker.actions.get("users.empty");
	let action = actions.get().data;
	let ctx = new Context({ broker, action});
	return Promise.resolve(action.handler(ctx));
});

bench.add("Broker action call (normal)", () => {
	return broker.call("users.empty");
});

/*let mw1 = (ctx, next) => {
	return next();
};

broker.use(mw1);

bench.add("Broker action call (normal)", () => {
	return broker.call("users.empty");
});
*/

bench.run();
