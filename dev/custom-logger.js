const ServiceBroker = require("../src/service-broker");

// const BaseLogger = require("moleculer").Loggers.Base;
const BaseLogger = require("../").Loggers.Base;

class MyLogger extends BaseLogger {
	getLogHandler(bindings) {
		return (type, args) => {
			return console[type](`[MYLOG-${bindings.mod}]`, ...args);
		};
	}
}

const broker = new ServiceBroker({
	logger: new MyLogger()
});

broker.start();
