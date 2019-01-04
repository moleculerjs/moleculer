const ServiceBroker = require("../src/service-broker");

const broker1 = new ServiceBroker({
	nodeID: "broker-2",
	transporter: "NATS",
	transit: {
		disableVersionCheck: true
	}
	//serializer: "Avro"
});
/*
const broker2 = new ServiceBroker({
	nodeID: "broker-2",
	transporter: "NATS",
	serializer: "ProtoBuf"
});
*/
async function start() {
	await broker1.start();
	//await broker2.start();
	broker1.repl();

	broker1.logger.info("Instance ID:", broker1.instanceID);

	/*broker1.localBus.on("$node.pong", payload => console.log(payload));

	setInterval(() => {
		//broker1.ping();
		broker1.call("greeter.hello").then(res => console.log(res));
	}, 2000);
	*/

}

start();
