"use strict";

const ServiceBroker = require("../../src/service-broker");
const { CustomError } = require("../../src/errors");

const broker = new ServiceBroker({ 
	logger: console,
	circuitBreaker: {
		enabled: true,
		maxFailures: 2,
		halfOpenTime: 5 * 1000
	}
});

let c = 0;
broker.createService({
	name: "circuit",
	actions: {
		"no-good"() {
			if (++c > 7) 
				c = 1;

			if (c > 5)
				return this.broker.Promise.reject(new CustomError("Not so good! " + c, 500));
			

			return Promise.resolve(c);
		}
	},
	events: {
		"circuit-breaker.*"(payload, nodeID, eventName) {
			this.broker.logger.info(eventName, payload.action.name);
		}
	}
});

broker.start();

//broker.call("users.empty").then(res => console.log(res));
setInterval(() => {
	broker.call("circuit.no-good").then(res => {
		console.log("Result:", res);
	}).catch(err => {
		console.warn("ERROR:", err.message);
	});

}, 1000);
