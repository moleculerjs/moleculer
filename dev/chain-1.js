"use strict";

let kleur = require("kleur");
let ServiceBroker = require("../src/service-broker");

// Create broker
let broker = new ServiceBroker({
	nodeID: "node-1",
	transporter: "NATS",
	//transporter: "amqp://192.168.51.29:5672",
	//serializer: "ProtoBuf",
	logger: console,
	circuitBreaker: {
		enabled: true,
		threshold: 0.1,
		windowTime: 30,
		minRequestCount: 5
	},
});

broker.createService({
	name: "test1",
	started() {
		setInterval(() => {
			this.logger.info("Call test2.hello");
			this.broker.call("test2.hello")
				.then(res => this.logger.info(res))
				.catch(err => this.logger.error(err.nodeID, err.stack));
		}, 2000);
	},

	events: {
		"$circuit-breaker.opened"(payload) {
			broker.logger.warn(kleur.yellow().bold(`---  Circuit breaker opened on '${payload.nodeID}'!`));
		},

		"$circuit-breaker.half-opened"(payload) {
			broker.logger.warn(kleur.green(`---  Circuit breaker half-opened on '${payload.nodeID}'!`));
		},

		"$circuit-breaker.closed"(payload) {
			broker.logger.warn(kleur.green().bold(`---  Circuit breaker closed on '${payload.nodeID}'!`));
		},
	}
});

broker.start().then(() => {
	//broker.repl();
});
