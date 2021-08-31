const ServiceBroker = require("../src/service-broker");

const broker = new ServiceBroker({
	namespace: "test",
	transporter: "Redis",
	registry: {
		discoverer: {
			type: "Redis",
			options: {
				monitor: false,
				//serializer: "Notepack",
				fullCheck: 10,
				heartbeatInterval: 10,
				heartbeatTimeout: 300,
				redis: {
					host: "localhost",
					db: 0
					//dropBufferSupport: true
				},
				scanLength: 100,
				cleanOfflineNodesTimeout: 600,
				disableHeartbeatChecks: false,
				disableOfflineNodeRemoving: false
			}
		}
	}
});

broker
	.start()
	.then(() => broker.repl())
	.catch(err => broker.logger.error(err));
