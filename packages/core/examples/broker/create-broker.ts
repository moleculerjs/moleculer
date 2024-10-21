import { ServiceBroker } from "../../src";

const broker = new ServiceBroker({ namespace: "my-namespace" });

async function start() {
	await broker.start();
	console.log("Broker started. Node ID:", broker.nodeID, "InstanceID:", broker.instanceID);
	await broker.stop();
}

start().catch(console.error);
