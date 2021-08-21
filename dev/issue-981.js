"use strict";

const { ServiceBroker } = require("../");

const broker = new ServiceBroker({
	cacher: {
		type: "Memory",
		options: {
			clone: false
		}
	}
});

broker.createService({
	name: "greeter",
	actions: {
		hello: {
			cache: true,
			handler: ctx => {
				return [1, 2];
			}
		}
	}
});

broker.start().then(() => {
	broker
		.call("greeter.hello")
		.then(res => {
			console.log(res);
			console.log(res.pop());

			return broker.call("greeter.hello");
		})
		.then(res => {
			console.log(res);
		})
		.catch(err => broker.logger.error(err.message));
});
