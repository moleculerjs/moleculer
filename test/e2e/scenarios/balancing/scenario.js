const _ = require("lodash");
const { assert, createNode, executeScenarios, addScenario } = require("../../utils");

const broker = createNode("supervisor");
broker.loadService("../../services/scenario.service.js");

addScenario("balance action calls", async () => {
	await broker.call("$scenario.clear");

	await Promise.all(_.times(9, async () => {
		await broker.call("test.work", {
			id: 1,
			name: "John"
		});
	}));

	// Wait for scenario events...
	await broker.Promise.delay(1000);

	const calls = await broker.call("$scenario.getCalledActions");

	assert(calls.length, 9);
	assert(calls.map(c => c.nodeID).sort(), [
		"node1", "node1", "node1",
		"node2", "node2", "node2",
		"node3", "node3", "node3",
	]);
});

addScenario("balance emitted events", async () => {
	await broker.call("$scenario.clear");

	await Promise.all(_.times(9, async () => {
		await broker.emit("sample.event", {
			id: 1,
			name: "John"
		});
	}));

	// Wait for scenario events...
	await broker.Promise.delay(1000);

	const events = await broker.call("$scenario.getEmittedEvents");

	assert(events.length, 9);
	assert(events.map(c => c.nodeID).sort(), [
		"node1", "node1", "node1",
		"node2", "node2", "node2",
		"node3", "node3", "node3",
	]);
});

addScenario("broadcast events", async () => {
	await broker.call("$scenario.clear");

	await Promise.all(_.times(5, async () => {
		await broker.broadcast("sample.event", {
			id: 1,
			name: "John"
		});
	}));

	// Wait for scenario events...
	await broker.Promise.delay(1000);

	const events = await broker.call("$scenario.getEmittedEvents");

	assert(events.length, 15);
	assert(events.map(c => c.nodeID).sort(), [
		"node1", "node1", "node1","node1", "node1",
		"node2", "node2", "node2","node2", "node2",
		"node3", "node3", "node3","node3", "node3",
	]);
});

executeScenarios(broker, ["test"], ["node1", "node2", "node3"]);
