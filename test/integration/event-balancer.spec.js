const ServiceBroker = require("../../src/service-broker");
const Promise = require("bluebird");

let flow = [];

let userService = {
	name: "users",
	events: {
		"user.created"() {
			flow.push(`${this.broker.nodeID}-${this.name}-uc`);
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
	const logger = null;//console;
	// Create nodes
	const master = new ServiceBroker({ namespace: ns, nodeID: "master", transporter: "Fake", logger });
	master.createService(otherService);
	master.createService(otherService, { name: "other2" });

	const nodeUser1 = new ServiceBroker({ namespace: ns, nodeID: "user-1", transporter: "Fake", logger });
	nodeUser1.createService(userService);
	const nodeUser2 = new ServiceBroker({ namespace: ns, nodeID: "user-2", transporter: "Fake", logger });
	nodeUser2.createService(userService);
	nodeUser2.createService(otherService);
	const nodeUser3 = new ServiceBroker({ namespace: ns, nodeID: "user-3", transporter: "Fake", logger });
	nodeUser3.createService(userService);

	const nodePay1 = new ServiceBroker({ namespace: ns, nodeID: "pay-1", transporter: "Fake", logger });
	nodePay1.createService(paymentService);
	const nodePay2 = new ServiceBroker({ namespace: ns, nodeID: "pay-2", transporter: "Fake", logger });
	nodePay2.createService(paymentService);
	nodePay2.createService(otherService, { name: "other2" });

	const nodeMail1 = new ServiceBroker({ namespace: ns, nodeID: "mail-1", transporter: "Fake", logger });
	nodeMail1.createService(mailService);
	const nodeMail2 = new ServiceBroker({ namespace: ns, nodeID: "mail-2", transporter: "Fake", logger });
	nodeMail2.createService(mailService);

	return [
		master,
		nodeUser1,
		nodeUser2,
		nodeUser3,
		nodePay1,
		nodePay2,
		nodeMail1,
		nodeMail2
	];
}


describe("Test broker.emit balancing", () => {
	const nodes = createNodes();
	const master = nodes[0];

	beforeAll(() => {
		return Promise.all(nodes.map(node => node.start()))
			/*.delay(500)
			.then(() => master.call("$node.list"))
			.then(list => console.log("All nodes is started!", list));*/
	});

	afterAll(() => {
		return Promise.all(nodes.map(node => node.stop()));
	});

	beforeEach(() => flow = []);

	it("send a 'user.created' event with balancing #1", () => {
		master.emit("user.created");
		expect(flow).toEqual([
			"user-1-users-uc",
			"pay-1-payment-uc",
			"mail-1-mail-u*"
		]);
	});

	it("send a 'user.created' event with balancing #2", () => {
		master.emit("user.created");
		expect(flow).toEqual([
			"user-2-users-uc",
			"pay-2-payment-uc",
			"mail-2-mail-u*"
		]);
	});

	it("send a 'user.created' event with balancing #3", () => {
		master.emit("user.created");
		expect(flow).toEqual([
			"user-3-users-uc",
			"pay-1-payment-uc",
			"mail-1-mail-u*"
		]);
	});

	it("send a 'user.created' event with balancing #4", () => {
		master.emit("user.created");
		expect(flow).toEqual([
			"user-1-users-uc",
			"pay-2-payment-uc",
			"mail-2-mail-u*"
		]);
	});


	it("send a 'user.updated' event with balancing #1", () => {
		master.emit("user.updated");
		expect(flow).toEqual([
			"mail-1-mail-u*"
		]);
	});

	it("send a 'user.updated' event with balancing #2", () => {
		master.emit("user.updated");
		expect(flow).toEqual([
			"mail-2-mail-u*"
		]);
	});

	it("send a 'user.created' event to filtered groups #1", () => {
		master.emit("user.created", null, "payment");
		expect(flow).toEqual([
			"pay-1-payment-uc"
		]);
	});

	it("send a 'user.created' event to filtered groups #2", () => {
		master.emit("user.created", null, ["payment", "mail"]);
		expect(flow).toEqual([
			"pay-2-payment-uc",
			"mail-1-mail-u*"
		]);
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

	it("broadcastLocal a 'user.created' event to local services", () => {
		master.broadcastLocal("user.created");
		expect(flow).toEqual([
		]);
	});

	it("broadcastLocal an 'other.thing' event to local services", () => {
		master.broadcastLocal("other.thing");
		expect(flow).toEqual([
			"master-other-ot",
			"master-other2-ot"
		]);
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
		expect(flow).toEqual([
			"master-other-ot",
			"master-other2-ot"
		]);
	});

	it("emit an 'other.thing' event with preferLocal", () => {
		master.emit("other.thing");
		expect(flow).toEqual([
			"master-other-ot",
			"master-other2-ot"
		]);
	});

	it("emit an 'other.thing' without preferLocal", () => {
		master.registry.opts.preferLocal = false;
		master.emit("other.thing");
		expect(flow).toEqual([
			"master-other-ot",
			"master-other2-ot"
		]);
		flow = [];

		master.emit("other.thing");
		expect(flow).toEqual([
			"user-2-other-ot",
			"pay-2-other2-ot"
		]);
	});


});


describe("Test broker.emit balancing 2", () => {
	const nodes = createNodes();
	const master = nodes[0];

	beforeAll(() => {
		return Promise.all(nodes.map(node => node.start())); //.then(() => console.log("All nodes is started!"));
	});

	afterAll(() => {
		return Promise.all(nodes.map(node => node.stop()));
	});

	beforeEach(() => flow = []);

	it("send a 'user.created' event with balancing #1", () => {
		master.emit("user.created");
		expect(flow).toEqual([
			"user-1-users-uc",
			"pay-1-payment-uc",
			"mail-1-mail-u*"
		]);
	});

});
