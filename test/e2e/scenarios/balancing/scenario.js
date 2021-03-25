const _ = require("lodash");
const { assert, createNode, executeScenarios, addScenario, logEventEmitting } = require("../../utils");

const broker = createNode("supervisor", {
	registry: {
		preferLocal: false
	}
});
const disableBalancer = broker.options.disableBalancer;

broker.loadService("../../services/scenario.service.js");

broker.createService({
	name: "users",
	events: {
		"user.created"(ctx) {
			logEventEmitting(this, ctx);
		}
	}
});

addScenario("balance action calls", async () => {
	await broker.call("$scenario.clear");
	// ---- ^ SETUP ^ ---
	const params = {
		id: 1,
		name: "John"
	};

	await Promise.all(_.times(9, async () => {
		await broker.call("test.work", params);
		await broker.Promise.delay(250);
	}));

	// ---- ˇ ASSERTS ˇ ---
	// Wait for scenario events...
	await broker.Promise.delay(1000);

	const calls = await broker.call("$scenario.getCalledActions");

	assert(calls.length, 9);
	if (!disableBalancer) {
		assert(calls.map(c => c.nodeID).sort(), [
			"node1", "node1", "node1",
			"node2", "node2", "node2",
			"node3", "node3", "node3",
		]);
	}
	assert(calls.filter(c => _.isEqual(c.params, params)).length, 9);
});

addScenario("direct action calls", async () => {
	await broker.call("$scenario.clear");
	// ---- ^ SETUP ^ ---
	const params = {
		id: 1,
		name: "John"
	};
	await Promise.all(_.times(9, async () => {
		await broker.call("test.work", params, {
			nodeID: "node2"
		});
	}));

	// ---- ˇ ASSERTS ˇ ---
	// Wait for scenario events...
	await broker.Promise.delay(1000);

	const calls = await broker.call("$scenario.getCalledActions");

	assert(calls.length, 9);
	assert(calls.map(c => c.nodeID).filter(id => id == "node2").length, 9);
	assert(calls.filter(c => _.isEqual(c.params, params)).length, 9);
});

addScenario("balance emitted events", async () => {
	await broker.call("$scenario.clear");
	// ---- ^ SETUP ^ ---
	const payload = {
		id: 1,
		name: "John"
	};

	await Promise.all(_.times(6, async () => {
		await broker.emit("user.created", payload);
	}));

	// ---- ˇ ASSERTS ˇ ---
	// Wait for scenario events...
	await broker.Promise.delay(1000);

	const events = await broker.call("$scenario.getEmittedEvents");

	assert(events.length, 6 * 3); // 6 emitted event and 3 services
	if (!disableBalancer) {
		assert(events.map(e => `${e.nodeID}:${e.service}`).sort(), [
			"node1:payment",	"node1:payment",	"node1:payment",
			"node1:users",		"node1:users",		"node1:users",
			"node2:mail",		"node2:mail",		"node2:mail",
			"node2:mail",		"node2:mail",		"node2:mail",
			"node3:payment",	"node3:payment",	"node3:payment",
			"supervisor:users",	"supervisor:users",	"supervisor:users",
		]);
	}
	assert(events.filter(e => _.isEqual(e.params, payload)).length, 6 * 3);
});

addScenario("broadcast events", async () => {
	await broker.call("$scenario.clear");
	// ---- ^ SETUP ^ ---
	const payload = {
		id: 1,
		name: "John"
	};

	await Promise.all(_.times(3, async () => {
		await broker.broadcast("user.created", payload);
	}));

	// ---- ˇ ASSERTS ˇ ---
	// Wait for scenario events...
	await broker.Promise.delay(1000);

	const events = await broker.call("$scenario.getEmittedEvents");

	assert(events.length, 15);
	if (!disableBalancer) {
		assert(events.map(e => `${e.nodeID}:${e.service}`).sort(), [
			"node1:payment",	"node1:payment",	"node1:payment",
			"node1:users",		"node1:users",		"node1:users",
			"node2:mail",		"node2:mail",		"node2:mail",
			"node3:payment",	"node3:payment",	"node3:payment",
			"supervisor:users",	"supervisor:users",	"supervisor:users",
		]);
	}
	assert(events.filter(e => _.isEqual(e.params, payload)).length, 15);
});

addScenario("broadcastLocal events", async () => {
	await broker.call("$scenario.clear");
	// ---- ^ SETUP ^ ---
	const payload = {
		id: 1,
		name: "John"
	};

	await Promise.all(_.times(3, async () => {
		await broker.broadcastLocal("user.created", payload);
	}));

	// ---- ˇ ASSERTS ˇ ---
	// Wait for scenario events...
	await broker.Promise.delay(1000);

	const events = await broker.call("$scenario.getEmittedEvents");

	assert(events.length, 3);
	assert(events.map(e => `${e.nodeID}:${e.service}`).sort(), [
		"supervisor:users",	"supervisor:users",	"supervisor:users",
	]);
	assert(events.filter(e => _.isEqual(e.params, payload)).length, 3);
});

executeScenarios(broker, ["test"], ["node1", "node2", "node3"]);
