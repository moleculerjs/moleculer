const ServiceBroker = require("../../src/service-broker");
const _ = require("lodash");

let flow = [];

let userService = {
	name: "users",
	events: {
		"user.created"() {
			flow.push(`${this.broker.nodeID}-${this.name}-uc`);
		},
		"$internal.user.event"() {
			flow.push(`${this.broker.nodeID}-${this.name}-$iue`);
		}
	}
};

let paymentService = {
	name: "payment",
	events: {
		"user.created"() {
			flow.push(`${this.broker.nodeID}-${this.name}-uc`);
		}
	}
};

let stripeService = {
	name: "stripe",
	events: {
		"user.created": {
			group: "payment",
			handler() {
				flow.push(`${this.broker.nodeID}-${this.name}-uc`);
			}
		}
	}
};

let mailService = {
	name: "mail",
	events: {
		"user.*"() {
			flow.push(`${this.broker.nodeID}-${this.name}-u*`);
		}
	}
};

let otherService = {
	name: "other",
	events: {
		"other.thing"() {
			flow.push(`${this.broker.nodeID}-${this.name}-ot`);
		}
	}
};

function createNodes(ns) {
	const logger = false;
	// Create nodes
	const master = new ServiceBroker({
		namespace: ns,
		nodeID: "master",
		transporter: "Fake",
		logger
	});
	master.createService(_.cloneDeep(otherService));
	master.createService({ ..._.cloneDeep(otherService), name: "other2" });

	const nodeUser1 = new ServiceBroker({
		namespace: ns,
		nodeID: "user-1",
		transporter: "Fake",
		logger
	});
	nodeUser1.createService(_.cloneDeep(userService));
	nodeUser1.localBus.on("$internal.user.event", () => flow.push("nodeUser1-on-$iue"));

	const nodeUser2 = new ServiceBroker({
		namespace: ns,
		nodeID: "user-2",
		transporter: "Fake",
		logger
	});
	nodeUser2.createService(_.cloneDeep(userService));
	nodeUser2.createService(_.cloneDeep(otherService));
	const nodeUser3 = new ServiceBroker({
		namespace: ns,
		nodeID: "user-3",
		transporter: "Fake",
		logger
	});
	nodeUser3.createService(_.cloneDeep(userService));

	const nodePay1 = new ServiceBroker({
		namespace: ns,
		nodeID: "pay-1",
		transporter: "Fake",
		logger
	});
	nodePay1.createService(_.cloneDeep(paymentService));
	const nodePay2 = new ServiceBroker({
		namespace: ns,
		nodeID: "pay-2",
		transporter: "Fake",
		logger
	});
	nodePay2.createService(_.cloneDeep(paymentService));
	nodePay2.createService({ ..._.cloneDeep(otherService), name: "other2" });

	const nodeMail1 = new ServiceBroker({
		namespace: ns,
		nodeID: "mail-1",
		transporter: "Fake",
		logger
	});
	nodeMail1.createService(_.cloneDeep(mailService));
	const nodeMail2 = new ServiceBroker({
		namespace: ns,
		nodeID: "mail-2",
		transporter: "Fake",
		logger
	});
	nodeMail2.createService(_.cloneDeep(mailService));

	return [master, nodeUser1, nodeUser2, nodeUser3, nodePay1, nodePay2, nodeMail1, nodeMail2];
}

describe("Test event balancing", () => {
	const nodes = createNodes("balancing");
	const master = nodes[0];
	const nodeUser1 = nodes[1];

	beforeAll(() => {
		return Promise.all(nodes.map(node => node.start())).delay(2000);
		/*.delay(500)
		.then(() => master.call("$node.list"))
		.then(list => console.log("All nodes is started!", list));*/
	});

	afterAll(() => {
		return Promise.all(nodes.map(node => node.stop()));
	});

	beforeEach(() => (flow = []));

	it("send a 'user.created' event with balancing #1", () => {
		master.emit("user.created");
		expect(flow).toEqual(["user-1-users-uc", "pay-1-payment-uc", "mail-1-mail-u*"]);
	});

	it("send a 'user.created' event with balancing #2", () => {
		master.emit("user.created");
		expect(flow).toEqual(["user-2-users-uc", "pay-2-payment-uc", "mail-2-mail-u*"]);
	});

	it("send a 'user.created' event with balancing #3", () => {
		master.emit("user.created");
		expect(flow).toEqual(["user-3-users-uc", "pay-1-payment-uc", "mail-1-mail-u*"]);
	});

	it("send a 'user.created' event with balancing #4", () => {
		master.emit("user.created");
		expect(flow).toEqual(["user-1-users-uc", "pay-2-payment-uc", "mail-2-mail-u*"]);
	});

	it("send a 'user.updated' event with balancing #1", () => {
		master.emit("user.updated");
		expect(flow).toEqual(["mail-1-mail-u*"]);
	});

	it("send a 'user.updated' event with balancing #2", () => {
		master.emit("user.updated");
		expect(flow).toEqual(["mail-2-mail-u*"]);
	});

	it("send a 'user.created' event to filtered groups #1", () => {
		master.emit("user.created", null, "payment");
		expect(flow).toEqual(["pay-1-payment-uc"]);
	});

	it("send a 'user.created' event to filtered groups #2", () => {
		master.emit("user.created", null, ["payment", "mail"]);
		expect(flow).toEqual(["pay-2-payment-uc", "mail-1-mail-u*"]);
	});

	it("broadcast a 'user.created' event to all nodes & services", () => {
		master.broadcast("user.created");
		expect(flow).toEqual([
			"user-1-users-uc",
			"user-2-users-uc",
			"user-3-users-uc",
			"pay-1-payment-uc",
			"pay-2-payment-uc",
			"mail-1-mail-u*",
			"mail-2-mail-u*"
		]);
	});

	it("broadcast a 'user.created' event to filtered group", () => {
		master.broadcast("user.created", null, "payment");
		expect(flow).toEqual(["pay-1-payment-uc", "pay-2-payment-uc"]);
	});

	it("broadcast a 'user.created' event to filtered groups", () => {
		master.broadcast("user.created", null, ["payment", "mail"]);
		expect(flow).toEqual([
			"pay-1-payment-uc",
			"pay-2-payment-uc",
			"mail-1-mail-u*",
			"mail-2-mail-u*"
		]);
	});

	it("broadcastLocal a 'user.created' event to local services", () => {
		master.broadcastLocal("user.created");
		expect(flow).toEqual([]);
	});

	it("broadcastLocal an 'other.thing' event to local services", () => {
		master.broadcastLocal("other.thing");
		expect(flow).toEqual(["master-other-ot", "master-other2-ot"]);
	});

	it("broadcast an 'other.thing' event to all services", () => {
		master.broadcast("other.thing");
		expect(flow).toEqual([
			"user-2-other-ot",
			"pay-2-other2-ot",
			"master-other-ot",
			"master-other2-ot"
		]);
	});

	it("emit an 'other.thing' event with preferLocal", () => {
		master.emit("other.thing");
		expect(flow).toEqual(["master-other-ot", "master-other2-ot"]);
	});

	it("emit an 'other.thing' event with preferLocal 2nd", () => {
		master.emit("other.thing");
		expect(flow).toEqual(["master-other-ot", "master-other2-ot"]);
	});

	it("emit an 'other.thing' without preferLocal", () => {
		master.registry.opts.preferLocal = false;
		master.emit("other.thing");
		expect(flow).toEqual(["master-other-ot", "master-other2-ot"]);
		flow = [];

		master.emit("other.thing");
		expect(flow).toEqual(["user-2-other-ot", "pay-2-other2-ot"]);
	});

	// --- LOCAL EVENTS ---

	it("broadcast a '$internal.user.event' event on master", () => {
		master.broadcast("$internal.user.event");
		expect(flow).toEqual(["user-1-users-$iue", "user-2-users-$iue", "user-3-users-$iue"]);
	});

	it("broadcast a '$internal.user.event' event on node1", () => {
		nodeUser1.broadcast("$internal.user.event");
		expect(flow).toEqual([
			"user-2-users-$iue",
			"user-3-users-$iue",
			"nodeUser1-on-$iue",
			"user-1-users-$iue"
		]);
	});

	it("broadcastLocal a '$internal.user.event' event on node1", () => {
		nodeUser1.broadcastLocal("$internal.user.event");
		expect(flow).toEqual(["nodeUser1-on-$iue", "user-1-users-$iue"]);
	});

	it("emit a '$internal.user.event' event on node1", () => {
		nodeUser1.emit("$internal.user.event");
		expect(flow).toEqual(["nodeUser1-on-$iue", "user-1-users-$iue"]);
	});
});

describe("Test multiple handler in the same group balancing", () => {
	const master = new ServiceBroker({
		namespace: "groups",
		nodeID: "master",
		transporter: "Fake",
		logger: false
	});
	master.createService(_.cloneDeep(paymentService));
	master.createService(_.cloneDeep(stripeService));
	master.createService(_.cloneDeep(userService));

	const nodePay1 = new ServiceBroker({
		namespace: "groups",
		nodeID: "pay-1",
		transporter: "Fake",
		logger: false
	});
	nodePay1.createService(_.cloneDeep(paymentService));
	nodePay1.createService(_.cloneDeep(stripeService));

	beforeAll(() => {
		return Promise.all([master.start(), nodePay1.start(), Promise.resolve().delay(2000)]);
	});

	afterAll(() => {
		return Promise.all([master.stop(), nodePay1.stop()]);
	});

	beforeEach(() => (flow = []));

	// --- EMIT WITH LOCALPREFER ---

	it("send a 'user.created' event with balancing #1", () => {
		master.emit("user.created");
		expect(flow).toEqual(["master-payment-uc", "master-users-uc"]);
	});

	it("send a 'user.created' event with balancing #2", () => {
		master.emit("user.created");
		expect(flow).toEqual(["master-stripe-uc", "master-users-uc"]);
	});

	it("send a 'user.created' event with balancing to filtered group", () => {
		master.emit("user.created", null, "payment");
		expect(flow).toEqual(["master-payment-uc"]);
	});

	// --- EMIT WITHOUT LOCALPREFER ---

	it("send a 'user.created' event with balancing #1", () => {
		master.registry.opts.preferLocal = false;
		nodePay1.registry.opts.preferLocal = false;
		master.emit("user.created");
		expect(flow).toEqual(["master-stripe-uc", "master-users-uc"]);
	});

	it("send a 'user.created' event with balancing #2", () => {
		master.emit("user.created");
		expect(flow).toEqual(["master-users-uc", "pay-1-payment-uc"]);
	});

	it("send a 'user.created' event with balancing to filtered group #1", () => {
		master.emit("user.created", null, "payment");
		expect(flow).toEqual(["pay-1-stripe-uc"]);
	});

	it("send a 'user.created' event with balancing to filtered group #2", () => {
		master.emit("user.created", null, "payment");
		expect(flow).toEqual(["master-payment-uc"]);
	});

	// --- BROADCAST ---

	it("broadcast a 'user.created' event to all nodes & services", () => {
		master.broadcast("user.created");
		expect(flow).toEqual([
			"pay-1-payment-uc",
			"pay-1-stripe-uc",
			"master-payment-uc",
			"master-stripe-uc",
			"master-users-uc"
		]);
	});

	it("broadcast a 'user.created' event to filtered group", () => {
		master.broadcast("user.created", null, "payment");
		expect(flow).toEqual([
			"pay-1-payment-uc",
			"pay-1-stripe-uc",
			"master-payment-uc",
			"master-stripe-uc"
		]);
	});

	it("broadcast a 'user.created' event to filtered groups", () => {
		master.broadcast("user.created", null, ["payment"]);
		expect(flow).toEqual([
			"pay-1-payment-uc",
			"pay-1-stripe-uc",
			"master-payment-uc",
			"master-stripe-uc"
		]);
	});
});
