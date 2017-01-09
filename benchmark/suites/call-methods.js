"use strict";

let _ = require("lodash");

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

let bench = new Benchmarker({ async: true, name: "Call methods"});

bench.skip("Direct service call", () => {
	return userService.actions.find()
		.catch(console.warn);
});

bench.skip("Manually call action via ctx.invoke", () => {
	let actions = broker.actions.get("users.find");
	let action = actions.get().data;
	let ctx = new Context({ broker, action});
	return ctx.invoke(() => action.handler(ctx));
});

bench.skip("Manually call action", () => {
	let actions = broker.actions.get("users.find");
	let action = actions.get().data;
	let ctx = new Context({ broker, action});
	return Promise.resolve(action.handler(ctx));
});

bench.add("Broker action call", () => {
	return broker.call("users.find")
		.catch(console.warn);
});

bench.run();
