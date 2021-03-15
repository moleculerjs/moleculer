"use strict";

let _ = require("lodash");
let ServiceBroker = require("../src/service-broker");
let { MoleculerRetryableError } = require("../src/errors");

// Create broker
let broker = new ServiceBroker({
	nodeID: "retry-a",
	transporter: "NATS",

	logger: console,
	logLevel: "info",
});

broker.createService({
	name: "vidispine",
	actions: {
		getApprovalRequestedSavedSearch(){
			this.logger.info("Called.");
			return new Promise((resolve, reject)=>{
				setTimeout(()=>{
					let er = new MoleculerRetryableError("AXIOS ERROR TRY AGAIN",500,"PLEASE RETRY");
					er.retryable = true;
					reject(er);
				},2000);
			});
		},
	},
});


broker.start()
	.then(() => {
		//broker.repl();
	});
