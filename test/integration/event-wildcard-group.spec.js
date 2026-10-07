"use strict";

const _ = require("lodash");
const ServiceBroker = require("../../src/service-broker");
const { PACKET_EVENT } = require("../../src/packets");

/**
 * A service that has an exact AND a wildcard handler for the same event
 * must receive an emitted event exactly once per group: on ONE instance,
 * where every matching handler of the group runs.
 */

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

let flow = [];

const auditService = {
	name: "audit",
	events: {
		"order.created"() {
			flow.push(`audit/exact@${this.broker.nodeID}`);
		},
		"order.*"() {
			flow.push(`audit/wildcard@${this.broker.nodeID}`);
		}
	}
};

const mailerService = {
	name: "mailer",
	events: {
		"order.created"() {
			flow.push(`mailer/exact@${this.broker.nodeID}`);
		}
	}
};

// Two different services that share the "audit" group, on different nodes
const auditExactOnlyService = {
	name: "audit-exact",
	events: {
		"order.created": {
			group: "audit",
			handler() {
				flow.push(`audit/exact@${this.broker.nodeID}`);
			}
		}
	}
};

const auditWildcardOnlyService = {
	name: "audit-wildcard",
	events: {
		"order.*": {
			group: "audit",
			handler() {
				flow.push(`audit/wildcard@${this.broker.nodeID}`);
			}
		}
	}
};

function createBroker(ns, nodeID, services, opts = {}) {
	const broker = new ServiceBroker(
		_.defaultsDeep({ namespace: ns, nodeID, transporter: "Fake", logger: false }, opts)
	);
	services.forEach(svc => broker.createService(_.cloneDeep(svc)));
	return broker;
}

async function waitForEndpoints(broker, eventName, group, count) {
	for (let i = 0; i < 200; i++) {
		const list = broker.registry.events.get(eventName, group);
		if (list && list.endpoints.filter(ep => ep.isAvailable).length === count) return;
		await wait(10);
	}
	throw new Error(`'${eventName}' (${group}) has not got ${count} endpoints on ${broker.nodeID}`);
}

const count = name => flow.filter(item => item.startsWith(`${name}@`)).length;
const nodesOf = name =>
	flow.filter(item => item.startsWith(`${name}@`)).map(item => item.split("@")[1]);

// Emit and give the (synchronous) Fake transporter a tick to deliver
async function emit(broker, eventName, groups) {
	flow = [];
	await broker.emit(eventName, null, groups);
	await wait(5);
}

async function broadcast(broker, eventName, groups) {
	flow = [];
	await broker.broadcast(eventName, null, groups);
	await wait(5);
}

describe("Test emit with exact & wildcard handlers in the same group (remote instances)", () => {
	const ns = "event-wildcard-remote";
	const node1 = createBroker(ns, "node-1", []);
	const node2 = createBroker(ns, "node-2", [auditService, mailerService]);
	const node3 = createBroker(ns, "node-3", [auditService, mailerService]);
	const nodes = [node1, node2, node3];

	// Record the EVENT packets which leave node-1
	let wire = [];

	beforeAll(async () => {
		await Promise.all(nodes.map(node => node.start()));
		await waitForEndpoints(node1, "order.created", "audit", 2);
		await waitForEndpoints(node1, "order.*", "audit", 2);
		await waitForEndpoints(node1, "order.created", "mailer", 2);

		const origPublish = node1.transit.publish.bind(node1.transit);
		node1.transit.publish = packet => {
			if (packet.type === PACKET_EVENT)
				wire.push({ target: packet.target, groups: packet.payload.groups });
			return origPublish(packet);
		};
	});

	afterAll(() => Promise.all(nodes.map(node => node.stop())));

	beforeEach(() => (wire = []));

	function expectOncePerGroup() {
		expect(count("audit/exact")).toBe(1);
		expect(count("audit/wildcard")).toBe(1);
		expect(count("mailer/exact")).toBe(1);
		// The audit group is served by ONE instance
		expect(nodesOf("audit/exact")).toEqual(nodesOf("audit/wildcard"));
	}

	it("should deliver 'order.created' once per group after the wildcard list was balanced alone", async () => {
		for (let i = 0; i < 4; i++) {
			// Advances only the round-robin counter of the 'order.*' list
			await emit(node1, "order.updated");
			expect(count("audit/wildcard")).toBe(1);

			await emit(node1, "order.created");
			expectOncePerGroup();
		}
	});

	it("should deliver 'order.created' once per group", async () => {
		await emit(node1, "order.created");
		expectOncePerGroup();
	});

	it("should deliver 'order.updated' only to the wildcard handler, once", async () => {
		await emit(node1, "order.updated");
		expect(flow).toEqual([expect.stringMatching(/^audit\/wildcard@node-[23]$/)]);
	});

	it("should not list a group twice in an EVENT packet", async () => {
		for (let i = 0; i < 4; i++) {
			wire = [];
			await emit(node1, "order.created");
			expectOncePerGroup();
			expect(wire.length).toBeGreaterThan(0);
			wire.forEach(({ groups }) => expect(_.uniq(groups)).toEqual(groups));
		}
	});

	it("should deliver once to the filtered group after the wildcard list was balanced alone", async () => {
		await emit(node1, "order.updated");
		wire = [];
		await emit(node1, "order.created", "audit");

		expect(count("audit/exact")).toBe(1);
		expect(count("audit/wildcard")).toBe(1);
		expect(count("mailer/exact")).toBe(0);
		expect(nodesOf("audit/exact")).toEqual(nodesOf("audit/wildcard"));
		expect(wire).toEqual([{ target: expect.any(String), groups: ["audit"] }]);
	});

	it("should still balance the group between the instances", async () => {
		const used = [];
		for (let i = 0; i < 4; i++) {
			await emit(node1, "order.created");
			expectOncePerGroup();
			used.push(nodesOf("audit/exact")[0]);
		}
		expect(_.uniq(used).sort()).toEqual(["node-2", "node-3"]);
	});

	it("should broadcast to every handler on every instance", async () => {
		await emit(node1, "order.updated");
		await broadcast(node1, "order.created");

		expect(flow.sort()).toEqual([
			"audit/exact@node-2",
			"audit/exact@node-3",
			"audit/wildcard@node-2",
			"audit/wildcard@node-3",
			"mailer/exact@node-2",
			"mailer/exact@node-3"
		]);
	});

	it("should broadcast a wildcard-only event to every instance", async () => {
		await broadcast(node1, "order.updated");

		expect(flow.sort()).toEqual(["audit/wildcard@node-2", "audit/wildcard@node-3"]);
	});
});

describe("Test emit with exact & wildcard handlers in the same group (local instance, preferLocal: false)", () => {
	const ns = "event-wildcard-local";
	const opts = { registry: { preferLocal: false } };
	const node1 = createBroker(ns, "node-1", [auditService], opts);
	const node2 = createBroker(ns, "node-2", [auditService], opts);
	const node3 = createBroker(ns, "node-3", [auditService], opts);
	const nodes = [node1, node2, node3];

	beforeAll(async () => {
		await Promise.all(nodes.map(node => node.start()));
		await waitForEndpoints(node1, "order.created", "audit", 3);
		await waitForEndpoints(node1, "order.*", "audit", 3);
	});

	afterAll(() => Promise.all(nodes.map(node => node.stop())));

	it("should run each handler once, on the same instance, even when the local one is selected", async () => {
		const used = [];
		for (let i = 0; i < 6; i++) {
			await emit(node1, "order.updated");
			expect(count("audit/wildcard")).toBe(1);

			await emit(node1, "order.created");
			expect(count("audit/exact")).toBe(1);
			expect(count("audit/wildcard")).toBe(1);
			expect(nodesOf("audit/exact")).toEqual(nodesOf("audit/wildcard"));
			used.push(nodesOf("audit/exact")[0]);
		}
		// Both the local and the remote paths were exercised
		expect(used).toContain("node-1");
		expect(used.some(nodeID => nodeID !== "node-1")).toBe(true);
	});
});

describe("Test emit with exact & wildcard handlers in the same group (local instance, preferLocal: true)", () => {
	const ns = "event-wildcard-prefer-local";
	const node1 = createBroker(ns, "node-1", [auditService]);
	const node2 = createBroker(ns, "node-2", [auditService]);
	const node3 = createBroker(ns, "node-3", [auditService]);
	const nodes = [node1, node2, node3];

	beforeAll(async () => {
		await Promise.all(nodes.map(node => node.start()));
		await waitForEndpoints(node1, "order.created", "audit", 3);
		await waitForEndpoints(node1, "order.*", "audit", 3);
	});

	afterAll(() => Promise.all(nodes.map(node => node.stop())));

	it("should run each handler once on the local instance", async () => {
		for (let i = 0; i < 3; i++) {
			await emit(node1, "order.updated");
			expect(flow).toEqual(["audit/wildcard@node-1"]);

			await emit(node1, "order.created");
			expect(flow.sort()).toEqual(["audit/exact@node-1", "audit/wildcard@node-1"]);
		}
	});
});

describe("Test emit when different services share a group across nodes", () => {
	const ns = "event-wildcard-shared-group";
	const node1 = createBroker(ns, "node-1", []);
	const node2 = createBroker(ns, "node-2", [auditExactOnlyService]);
	const node3 = createBroker(ns, "node-3", [auditWildcardOnlyService]);
	const nodes = [node1, node2, node3];

	beforeAll(async () => {
		await Promise.all(nodes.map(node => node.start()));
		await waitForEndpoints(node1, "order.created", "audit", 1);
		await waitForEndpoints(node1, "order.*", "audit", 1);
	});

	afterAll(() => Promise.all(nodes.map(node => node.stop())));

	it("should run the handlers living on different nodes once each", async () => {
		for (let i = 0; i < 3; i++) {
			await emit(node1, "order.updated");
			expect(flow).toEqual(["audit/wildcard@node-3"]);

			await emit(node1, "order.created");
			expect(flow.sort()).toEqual(["audit/exact@node-2", "audit/wildcard@node-3"]);
		}
	});
});
