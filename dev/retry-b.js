"use strict";

let path = require("path");
let _ = require("lodash");
let chalk = require("chalk");
let ServiceBroker = require("../src/service-broker");
let { MoleculerRetryableError } = require("../src/errors");

// Create broker
let broker = new ServiceBroker({
	nodeID: "retry-b",
	transporter: "NATS",

	logger: console,
	logLevel: "info"
});

broker.createService({
	name: "testservice",
	async started() {
		broker.waitForServices(["vidispine"],3000).then(()=>{
			broker.call("vidispine.getApprovalRequestedSavedSearch",null,{retries:5})
				.then(broker.logger.info)
				.catch(((e)=>{
					broker.logger.error({
						error: e.name,
						retries: e.ctx.retries,
					});
				}));
		});
	}
});


broker.start()
	.then(() => {
		//broker.repl();
	});
