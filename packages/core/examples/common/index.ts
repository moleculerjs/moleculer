import { assert } from "node:console";
import { ServiceBroker } from "../../src";
import { BrokerState } from "../../src/broker";
import { Service } from "../../src/service";

class MyNativeService extends Service {
	public constructor() {
		super("my-native-service");
	}

	public override async start(broker: ServiceBroker): Promise<void> {
		await super.start(broker);

		this.broker.logger.info(`${this.fullName} service started.`);

		return Promise.resolve();
	}

	public override async stop(): Promise<void> {
		await super.stop();

		this.broker.logger.info(`${this.fullName} service stopped.`);
		return Promise.resolve();
	}
}

async function start() {
	const broker = new ServiceBroker({ namespace: "my-namespace" });
	assert(broker.getLocalServiceCount() === 0, "Invalid services length (0)");

	const myNativeService = new MyNativeService();
	await broker.loadService(myNativeService);
	assert(broker.getLocalServiceCount() === 1, "Invalid services length (1)");
	assert(
		broker.getLocalService("my-native-service") === myNativeService,
		"Not found service by name",
	);
	assert(
		broker.getLocalService({ name: "my-native-service" }) === myNativeService,
		"Not found service by name object",
	);
	assert(
		broker.getLocalService({ name: "my-native-service", version: 2 }) === undefined,
		"Found service by version but it has no version",
	);

	await broker.createService({ name: "posts" });
	assert(broker.getLocalServiceCount() === 2, "Invalid services length (2)");

	assert(broker.state === BrokerState.CREATED, "Wrong broker state");
	await broker.start();
	assert(broker.state === BrokerState.STARTED, "Wrong broker state");
	assert(broker.namespace === "my-namespace", "Invalid namespace");
	assert(!!broker.instanceID, "Missing instanceID");
	assert(!!broker.nodeID, "Missing nodeID");

	console.log("Broker started. Node ID:", broker.nodeID, "InstanceID:", broker.instanceID);

	await broker.stop();
	assert(broker.state === BrokerState.STOPPED, "Wrong broker state");
}

start().catch(console.error);
