const ApiGateway = require
const ServiceBroker = require("../src/service-broker");
const util = require("util");

const broker = new ServiceBroker({
	nodeID: "dev",// + process.pid,
	//transporter: "mqtt://localhost:1833",
	transporter: "TCP",
	metrics: true,
	cacher: {
		type: 'Redis',
		options: {
			prefix: 'COM',
			ttl: 1,
			redis: {
				port: 30598,
				host: 'localhost',
				environment: 'dev',
				namespace: 'chatToken',
				expire: 60 * 60 * 24
			}
		}
	}
	//logLevel: "debug",
	//logObjectPrinter: o => util.inspect(o, { depth: 4, colors: true, breakLength: 50 }), // `breakLength: 50` activates multi-line object
});

broker.createService({
	name: "test",
	actions: {
		async hello(ctx) {
			await this.broker.cacher.del('test.*');
			return "Hello Moleculer";
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
