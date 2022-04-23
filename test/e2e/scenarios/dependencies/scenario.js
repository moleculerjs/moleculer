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

	actions: {
		add: {
			handler(ctx) {
				FLOW.push("tenant.add action called");
				return "tenant.add action";
			}
		}
	},

	async started() {
		FLOW.push("tenant.service started");
	}
};

broker1.createService(locationSchema);
broker1.createService(tenantSchema);

addScenario("Test service dependency start flow", async () => {
	assert(FLOW, [
		"tenant.service started",
		"device.service started",
		"tenant.add action called",
		"response from tenant: tenant.add action",
		"location.service started"
	]);
});

/////////////// NODE - 2 ///////////////
const broker2 = createNode("node-2");
const assetSchema = {
	name: "device",

	// Depends on tenant.service located at node-1
	dependencies: ["tenant"],

	async started() {
		FLOW.push("device.service started");

		const result = await this.broker.call("tenant.add");

		FLOW.push("response from tenant: " + result);
	}
};
broker2.createService(assetSchema);
broker2.start();

executeScenarios(broker1);
