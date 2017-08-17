/* eslint-disable no-console */

"use strict";

let ServiceBroker = require("../src/service-broker");

let broker = new ServiceBroker({
	logger: true
});

broker.loadService("./examples/math.service");
broker.loadService("./examples/post.service");
broker.loadService("./examples/user.service");


broker.start().delay(500)

	.then(() => {
		console.log("\n--- ARRAY MCALL ---");

		return broker.mcall([
			{ action: "posts.find", params: {limit: 2, offset: 0} },
			{ action: "v2.users.find", params: {limit: 2, sort: "username"} }
		]);

	})
	.then(res => console.log(res))

	.then(() => {
		console.log("\n--- OBJECT MCALL ---");

		return broker.mcall({
			posts: { action: "posts.find", params: {limit: 2, offset: 0} },
			users: { action: "v2.users.find", params: {limit: 2, sort: "username"} }
		});

	})
	.then(res => console.log(res))

	.catch(err => console.log(err))
	.then(() => broker.stop());
