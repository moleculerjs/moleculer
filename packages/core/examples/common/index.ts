import { assert } from "node:console";
import { ServiceBroker } from "../../src";
import { BrokerState } from "../../src/broker";
import { Service } from "../../src/service";

class MyNativeService extends Service {
	public override metadata = {
		region: "us-east",
		zone: "a",
		cluster: true,
	};

	public override settings = {
		a: 5,
		b: "Test",
	};

	public constructor() {
		super("my-native-service");
	}

	public override async init(broker: ServiceBroker): Promise<void> {
		await super.init(broker);

		this.broker.logger.info(
			`${this.fullName} service initialized. settings.a: ${this.settings.a}, metadata.region: ${this.metadata.region}`,
		);

		return Promise.resolve();
	}

	public override async start(): Promise<void> {
		await super.start();

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
	// --- CREATE BROKER ---
	const broker = new ServiceBroker({ namespace: "my-namespace" });
	assert(broker.getLocalServiceCount() === 0, "Invalid services length (0)");

	// --- CREATE NATIVE CLASS SERVICE ---
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

	// --- CREATE SERVICE FROM SCHEMA ---
	await broker.createService({
		name: "posts",
		version: 2,
		metadata: {
			region: "us-west",
			zone: "b",
			cluster: false,
		},
		settings: {
			a: 10,
			b: "Test2",
		},

		created() {
			this.logger.info(`??? Service '${this.fullName}' created is called.`);
			this.logger.info(
				`??? settings.a: ${this.settings.a}, metadata.region: ${this.metadata.region}`,
			);
			return Promise.resolve();
		},

		started() {
			this.logger.info(`??? Service '${this.fullName}' started is called.`);
			return Promise.resolve();
		},

		stopped() {
			this.logger.info(`??? Service '${this.fullName}' stopped is called.`);
			return Promise.resolve();
		},
	});
	assert(broker.getLocalServiceCount() === 2, "Invalid services length (2)");

	// --- START BROKER ---
	assert(broker.state === BrokerState.CREATED, "Wrong broker state");
	await broker.start();
	assert(broker.state === BrokerState.STARTED, "Wrong broker state");
	assert(broker.namespace === "my-namespace", "Invalid namespace");
	assert(!!broker.instanceID, "Missing instanceID");
	assert(!!broker.nodeID, "Missing nodeID");
	console.log("Broker started. Node ID:", broker.nodeID, "InstanceID:", broker.instanceID);

	// --- STOP BROKER ---
	await broker.stop();
	assert(broker.state === BrokerState.STOPPED, "Wrong broker state");
}

start().catch(console.error);
