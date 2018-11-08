"use strict";
const ServiceBroker = require("../src/service-broker");
const util = require("util");

const broker = new ServiceBroker({
	nodeID: "dev",// + process.pid,
	//transporter: "mqtt://localhost:1833",
	transporter: {
		type: 'NATS',
		options: {
			url: 'nats://10.0.0.1:31002',
			user: 'nats_client',
			pass: 'v0LAHfyyZV'
		}
	},
	metrics: true,
	logger: true,
	logLevel: 'info',
	cacher: {
		type: 'Redis',
		options: {
			prefix: 'COM',
			ttl: 111111,
			redis: {
				port: 32488,
				host: 'localhost',
				expire: 60 * 60 * 24
			}
		}
	}
	//logLevel: "debug",
	//logObjectPrinter: o => util.inspect(o, { depth: 4, colors: true, breakLength: 50 }), // `breakLength: 50` activates multi-line object
});

broker.createService({
	name: "test",
	params: {
		receivingUserId: 'string'
	},
	settings: {
		cacher: true
	},
	actions: {
		async hello(ctx) {
			this.logger.info('-indie--');
			// this.broker.cacher.set("test." + ctx.params.receivingUserId, ctx.params.receivingUserId);
			await this.broker.cacher.clean(['test.*']);
			return "Hello " + ctx.params.receivingUserId;
		}
	}
});

//broker.loadService("./examples/stat.service.js");

broker.start()
	.then(() => broker.repl());
/*	.delay(1000)
	.then(() => broker.call("stat.snapshot"))
	.then(res => broker.logger.info(res))
	.catch(err => broker.logger.error(err));
*/
