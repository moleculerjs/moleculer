const _ = require("lodash");
const { assert, createNode, executeScenarios, addScenario, logEventEmitting } = require("../../utils");

const broker = createNode("supervisor", {
	registry: {
		preferLocal: false
	}
});
const disableBalancer = broker.options.disableBalancer;
const transporter = broker.options.transporter;

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

if (disableBalancer && ["AMQP"].includes(transporter)) {
	addScenario("balance action calls based on availability", async () => {
		// Should allow consumers to pull messages as they can handle them.
		// This means that a single slow node won't slow down everything, or cause requests to be
		// processed out of order

		await broker.call("$scenario.clear");
		// ---- ^ SETUP ^ ---

		await Promise.all([
			broker.call("test.hello", { i : 0, delay: 2000 }),
			..._.times(8, i => broker.call("test.hello", { i: i + 1, delay: 50 }))
		]);

		// ---- ˇ ASSERTS ˇ ---
		// Wait for scenario events...
		await broker.Promise.delay(1000);

		const calls = await broker.call("$scenario.getCalledActions");

		assert(calls.length, 9);

		const slowNode = calls.find(c => c.params.i == 0).nodeID;

		assert(calls.filter(c => c.nodeID == slowNode).length, 1);
		assert(calls.filter(c => c.nodeID != slowNode).length, 8);
	});

	addScenario("balance action calls with crash", async () => {
		// The 'node1' will crash during processing the request and doesn't ACK the request.
		// AMQP will send the request to another node, so all requests should be handled properly.

		await broker.call("$scenario.clear");
		// ---- ^ SETUP ^ ---

		await Promise.all([
			..._.times(9, i => broker.call("test.hello", { i: i + 1, delay: 50, crash: true }))
		]);

		// ---- ˇ ASSERTS ˇ ---
		// Wait for scenario events...
		await broker.Promise.delay(1000);

		const calls = await broker.call("$scenario.getCalledActions");
		assert(calls.length, 9);

		assert(calls.filter(c => c.nodeID != "node1").length, 9);
	});
}

executeScenarios(broker, ["test", "users", "payment", "mail"], ["node1", "node2", "node3"]);
