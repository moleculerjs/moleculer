const { assert, createNode, executeScenarios, addScenario } = require("../../utils");

const FLOW = [];

/////////////// NODE - 1 ///////////////
const broker1 = createNode("node-1");
const locationSchema = {
	name: "location",

	// depends on device.service at node-2
	dependencies: ["device"],

	async started() {
		FLOW.push("location.service started");
	}
};

const tenantSchema = {
	name: "tenant",

	async started() {
		FLOW.push("tenant.service started");
	}
};

broker1.createService(locationSchema);
broker1.createService(tenantSchema);

addScenario("Test service dependency start flow", async () => {
	assert(FLOW, ["tenant.service started", "device.service started", "location.service started"]);
});

/////////////// NODE - 2 ///////////////
const broker2 = createNode("node-2");
const assetSchema = {
	name: "device",

	// Depends on tenant.service located at node-1
	dependencies: ["tenant"],

	async started() {
		FLOW.push("device.service started");
	}
};
broker2.createService(assetSchema);
broker2.start();

executeScenarios(broker1);
