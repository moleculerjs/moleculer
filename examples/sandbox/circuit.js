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
// First unstable instance
broker.createService({
	name: "circuit",
	actions: {
		"no-good"() {
			if (++this.c > 7) 
				this.c = 1;

			if (this.c > 5)
				return this.broker.Promise.reject(new CustomError("Not so good! " + this.c, 500));
			

			return Promise.resolve("UNSTABLE " + this.c);
		}
	},
	
	events: {
		"circuit-breaker.*"(payload, nodeID, eventName) {
			this.broker.logger.info(eventName, payload.action.name);
		}
	},
	
	created() {
		this.c = 0;
	}
});

// Second instance
broker.createService({
	name: "circuit",
	actions: {
		"no-good"() {
			return Promise.resolve("ALWAYS GOOD");
			/*if (++this.c > 5) 
				this.c = 1;

			if (this.c > 3)
				return this.broker.Promise.reject(new CustomError("Not so good! " + this.c, 500));
			

			return Promise.resolve("SECOND " + this.c);		*/	
		}
	},

	created() {
		this.c = 0;
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
