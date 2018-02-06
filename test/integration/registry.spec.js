const Promise = require("bluebird");
const H = require("./helpers");

let userService = {
	name: "users",
	actions: {
		find() {},
		get() {}
	},
	events: {
		"user.created"() {},
		"user.removed"() {}
	}
};

const paymentService = {
	name: "payments",
	actions: {
		charge() {},
		checkCard() {}
	},

	events: {
		"user.created"() {},
		"user.paid"() {}
	}
};

const paymentModService = {
	name: "payments",
	actions: {
		charge() {},
		//checkCard() {}
		checkCreditCard() {}
	},

	events: {
		"user.created"() {},
		//"user.paid"() {}
		"payment.done"() {}
	}
};

const postService = {
	name: "posts",
	actions: {
		find() {},
		get() {}
	},

	events: {
		"post.created"() {}
	}
};

const mailService = {
	name: "mail",
	actions: {
		send() {}
	}
};

const master = H.createNode("master", []);
const node1 = H.createNode("node-1", [userService]);

const node2 = H.createNode("node-2", [userService, paymentService]);

describe("Test service registry", () => {
	beforeAll(() => master.start());
	afterAll(() => master.stop());

	it("should list local $node service", () => {
		expect(H.hasService(master, "$node")).toBe(true);
		expect(H.hasService(master, "users")).toBe(false);
		expect(H.getActionNodes(master, "$node.list")).toEqual(["master"]);
	});

	it("start node1 with userService", () => {
		return node1.start().delay(100).then(() => {
			expect(H.getNode(master, "node-1")).toBeDefined();
			expect(H.hasService(master, "users")).toBe(true);
			expect(H.hasAction(master, "users.find")).toBe(true);
			expect(H.hasAction(master, "users.get")).toBe(true);

			expect(H.getActionNodes(master, "users.find")).toEqual(["node-1"]);
			expect(H.getActionNodes(master, "users.get")).toEqual(["node-1"]);

			expect(H.getActionNodes(master, "$node.list")).toEqual(["master", "node-1"]);

			expect(H.getEventNodes(master, "user.created")).toEqual(["node-1"]);
		});
	});

	it("start node2 with userService & payment service", () => {
		return node2.start().delay(100).then(() => {
			let node2 = H.getNode(master, "node-2");
			expect(node2).toBeDefined();
			expect(node2.available).toBe(true);
			expect(node2.services.length).toBe(3);

			expect(H.hasService(master, "payments")).toBe(true);
			expect(H.hasAction(master, "payments.charge")).toBe(true);
			expect(H.hasAction(master, "payments.checkCard")).toBe(true);
			expect(H.hasAction(node1, "payments.checkCard")).toBe(true);

			expect(H.getActionNodes(master, "users.find")).toEqual(["node-1", "node-2"]);
			expect(H.getActionNodes(master, "users.get")).toEqual(["node-1", "node-2"]);

			expect(H.getActionNodes(master, "$node.list")).toEqual(["master", "node-1", "node-2"]);

			expect(H.getEventNodes(master, "user.created")).toEqual(["node-1", "node-2"]);
			expect(H.getEventNodes(master, "user.paid")).toEqual(["node-2"]);
		});
	});

	it("stop node2", () => {
		return node2.stop().delay(100).then(() => {
			let node2 = H.getNode(master, "node-2");
			expect(node2).toBeDefined();
			expect(node2.available).toBe(false);
			expect(H.hasService(master, "payments")).toBe(true);
			expect(H.getActionNodes(master, "payments.charge")).toEqual([]);
			expect(H.getActionNodes(master, "payments.checkCard")).toEqual([]);
			expect(H.getActionNodes(node1, "payments.checkCard")).toEqual([]);

			expect(H.getActionNodes(master, "users.find")).toEqual(["node-1"]);
			expect(H.getActionNodes(master, "users.get")).toEqual(["node-1"]);

			expect(H.getActionNodes(master, "$node.list")).toEqual(["master", "node-1"]);

			expect(H.getEventNodes(master, "user.created")).toEqual(["node-1"]);
			expect(H.getEventNodes(master, "user.paid")).toEqual([]);
		});
	});

	it("node2 remove user, payment & add posts, paymentMod", () => {
		H.removeServices(node2, ["users", "payments"]);
		H.addServices(node2, [paymentModService, postService]);

		return node2.start().delay(100).then(() => {
			let node2 = H.getNode(master, "node-2");
			expect(node2).toBeDefined();
			expect(node2.services.length).toBe(3);
			expect(node2.available).toBe(true);
			expect(H.hasService(master, "payments")).toBe(true);
			expect(H.getActionNodes(master, "payments.charge")).toEqual(["node-2"]);
			expect(H.getActionNodes(master, "payments.checkCreditCard")).toEqual(["node-2"]);
			expect(H.getActionNodes(master, "payments.checkCard")).toEqual([]);
			expect(H.isActionAvailable(master, "payments.checkCard")).toBe(false);

			expect(H.getActionNodes(master, "users.find")).toEqual(["node-1"]);
			expect(H.getActionNodes(master, "users.get")).toEqual(["node-1"]);

			expect(H.getEventNodes(master, "user.created")).toEqual(["node-1", "node-2"]);
			expect(H.getEventNodes(master, "user.paid")).toEqual([]);
			expect(H.getEventNodes(master, "payment.done")).toEqual(["node-2"]);
		});
	});

	it("load mail on-the-fly to node1", () => {
		H.addServices(node1, [mailService]);

		return Promise.resolve().delay(100).then(() => {
			expect(H.hasService(master, "mail")).toBe(true);
			expect(H.getActionNodes(master, "mail.send")).toEqual(["node-1"]);
		});
	});

	it("destroy mail on-the-fly to node1", () => {
		H.removeServices(node1, ["mail"]);

		return Promise.resolve().delay(100).then(() => {
			expect(H.hasService(master, "mail")).toBe(false);
			expect(H.getActionNodes(master, "mail.send")).toEqual([]);
		});
	});
});
