const ServiceBroker = require("../src/service-broker");
const Promise = require("bluebird");

const broker = new ServiceBroker(/*{ Promise }*/);

broker.start()
	.then(() => broker.repl())
	.then(() => broker.logger.info("1"))
	.delay(2000)
	.timeout(2500)
	.then(() => broker.logger.info("2"))
	.catch(err => broker.logger.error(err));
