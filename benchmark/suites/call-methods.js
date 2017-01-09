"use strict";

let _ = require("lodash");

let Benchmarker = require("../benchmarker");
Benchmarker.printHeader("Call method benchmark");

let ServiceBroker = require("../../src/service-broker");

// Create broker
let broker = new ServiceBroker();

// Load broker actions map with fake keys
for(let i = 0; i < 500; i++) 
	broker.actions.set("users." + (Math.random()*1e32).toString(36), {});

// Load user service
let userService = broker.loadService(__dirname + "/../user.service");

let bench = new Benchmarker({ async: true, name: "Call methods"});

bench.add("Direct service call", () => {
	return userService.actions.find()
		/*.then(() => {
			return userService.actions.get({
				id: 4
			});
		})
		.then(() => {
			return userService.actions.get({
				id: 2
			});
		})
		.then(() => {
			return userService.actions.find();
		})*/
		.catch((err) => {
			console.warn(err);
		});
});

bench.add("Broker action call", () => {
	return broker.call("users.find")
		/*.then(() => {
			return broker.call("users.get", {
				id: 4
			});
		})
		.then(() => {
			return broker.call("users.get", {
				id: 2
			});
		})
		.then(() => {
			return broker.call("users.find");
		})*/
		.catch((err) => {
			console.warn(err);
		});
});

bench.run();
