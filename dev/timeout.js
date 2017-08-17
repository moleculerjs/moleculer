/* eslint-disable no-console */

"use strict";

let ServiceBroker = require("../src/service-broker");

let broker = new ServiceBroker({
	logger: console,
	validation: false,
	metrics: true
});

broker.loadService(__dirname + "/../examples/metrics.service");
broker.loadService(__dirname + "/../examples/user.service");
broker.loadService(__dirname + "/../examples/post.service");

broker.start();

//broker.call("users.empty").then(res => console.log(res));
let p = broker.call("posts.slowGet", { id: 5 }, { timeout: 3000 });
p.then(res => {
	const ctx = p.ctx;
	console.log(`Success! Action: ${ctx.action.name}, Duration: ${ctx.duration}`);
	//console.log("Result:", res);
}).catch(err => {
	console.warn("Something happened!", err.message);
});
