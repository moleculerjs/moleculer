"use strict";

const ServiceBroker = require("../src/service-broker");
const util = require("util");

const broker = new ServiceBroker({
	nodeID: "dev-metric",// + process.pid,
	//transporter: "TCP",
	metrics: {
		enabled: true,
		reporter: [
			{
				type: "Console",
				options: {
					//includes: "moleculer.request.**",
					//excludes: ["moleculer.transit.publish.total", "moleculer.transit.receive.total"]
				}
			},
			{
				type: "Prometheus",
				options: {
					//includes: ["moleculer.transit.**"]
				}
			}
		]
		//defaultQuantiles: [0.1, 0.5, 0.9]
	},
	logLevel: "debug",
	//logObjectPrinter: o => util.inspect(o, { depth: 4, colors: true, breakLength: 50 }), // `breakLength: 50` activates multi-line object
});

broker.start()
	.then(() => broker.repl());
/*	.delay(1000)
	.then(() => broker.call("stat.snapshot"))
	.then(res => broker.logger.info(res))
	.catch(err => broker.logger.error(err));
*/
