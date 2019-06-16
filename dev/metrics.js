"use strict";

const ServiceBroker = require("../src/service-broker");
const util = require("util");

const broker = new ServiceBroker({
	nodeID: "dev-metrics",// + process.pid,
	//transporter: "TCP",
	metrics: {
		enabled: true,
		reporter: [
			/*{
				type: "Console",
				options: {
					//includes: "moleculer.request.**",
					//excludes: ["moleculer.transit.publish.total", "moleculer.transit.receive.total"]
				}
			},*/
			/*{
				type: "Event",
				options: {
					eventName: "$metrics.state",
					includes: "moleculer.broker.**",
					excludes: ["moleculer.request.error.**", "moleculer.request.fallback.**"]
				}
			},*/
			/*{
				type: "CSV",
				options: {
					folder: "./dev/trash/csv-metrics",
					//includes: "os.network.family",
					//excludes: ["moleculer.request.error.**", "moleculer.request.fallback.**"]
					//types: "histogram",
					//mode: "label",
					delimiter: ";",
					rowDelimiter: "\r\n",

					rowFormatter(data) {
						data[0] = new Date(data[0]).toISOString();
						return data;
					}
				}
			},*/
			/*{
				type: "Prometheus",
				options: {
					//includes: ["moleculer.transit.**"]
				}
			},*/
			{
				type: "StatsD",
				options: {
					host: "localhost",
					prefix: "statsd.",
					//includes: "moleculer.**",
				}
			}
		]
		//defaultQuantiles: [0.1, 0.5, 0.9]
	},
	logLevel: "debug",
	//logObjectPrinter: o => util.inspect(o, { depth: 4, colors: true, breakLength: 50 }), // `breakLength: 50` activates multi-line object
});

broker.createService({
	name: "event-handler",
	events: {
		"$metrics.state"(payload) {
			this.broker.logger.info("Metrics event received! Size:", payload.length);
			this.broker.logger.info(util.inspect(payload, { depth: 4, colors: true }));
		}
	}
});

broker.start()
	.then(() => {
		broker.repl();

		let c = 5;
		const timer = setInterval(() => {
			broker.call("$node.metrics")
				.then(res => broker.logger.info("OK"))
				.catch(err => broker.logger.error(err));
			c--;
			if (c <= 0)
				clearInterval(timer);
		}, 5000);

	});
