"use strict";

let Promise	= require("bluebird");
let ServiceBroker = require("../../src/service-broker");

let broker = new ServiceBroker({ logger: console, validation: false, metrics: true });
broker.loadService(__dirname + "/../../benchmark/user.service");
broker.loadService(__dirname + "/../metrics.service");

broker.start();

console.log(" --- CALL ---");
//broker.call("users.empty").then(res => console.log(res));
let p = broker.call("users.validate", { id: 5 });
p.then(res => {
	const ctx = p.ctx;
	console.log(`Success! Action: ${ctx.action.name}, Duration: ${ctx.duration}`);
	console.log("Result:", res);
});
