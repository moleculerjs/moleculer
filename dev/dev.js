"use strict";

const ServiceBroker = require("../src/service-broker");
const util = require("util");

const broker = new ServiceBroker({
	nodeID: "dev-" + process.pid,
	logger: true,
	//logLevel: "debug",
	transporter: "TCP",
});

const svc = broker.loadService("examples/hot.service");

broker.start()
	.then(() => broker.repl())
	/*.delay(2000)
	.then(() => {
		console.log("Destroy hot service");
		broker.destroyService(svc);
	})*/
	.delay(1000)
	//.then(() => broker.call("$node.actions", { onlyAvailable: false }).then(res => broker.logger.info(res)));
	.then(() => {
		const info = broker.registry.getLocalNodeInfo();
		console.log(util.inspect(info, { showHidden: false, depth: 5, colors: true }))

	});
