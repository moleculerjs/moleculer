const E = require("../../src/errors");
const H = require("./helpers");
const { protectReject } = require("../unit/utils");

let userService = {
	name: "users",
	actions: {
		find() {
			return "Found";
		},
		get: {
			visibility: "public",
			handler() {
				return "Got";
			}
		},
		update: {
			visibility: "protected",
			handler() {
				return "Updated";
			}
		},
		remove: {
			visibility: "private",
			handler() {
				return "Removed";
			}
		},
		removeWrap() {
			return this.actions.remove();
		}
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

describe("Test service registry", () => {
	const servicesChanged = jest.fn();
	const master = H.createNode({ namespace: "first", nodeID: "master" }, [
		{
			name: "watcher",
			events: {
				"$services.changed": servicesChanged
			}
		}
	]);
	const node1 = H.createNode({ namespace: "first", nodeID: "node-1" }, [userService]);

	let node2 = H.createNode({ namespace: "first", nodeID: "node-2" }, [
		userService,
		paymentService
	]);

	beforeAll(() => master.start());
	afterAll(() => master.stop());

	it("should list local $node service", () => {
		expect(H.hasService(master, "$node")).toBe(true);
		expect(H.hasService(master, "users")).toBe(false);
		expect(H.getActionNodes(master, "$node.list")).toEqual(["master"]);
		expect(servicesChanged).toHaveBeenCalledTimes(1);
	});

	it("start node1 with userService", () => {
		servicesChanged.mockClear();

		return node1
			.start()
			.delay(2000)
			.then(() => {
				expect(H.getNode(master, "node-1")).toBeDefined();
				expect(H.hasService(master, "users")).toBe(true);
				expect(H.hasAction(master, "users.find")).toBe(true);
				expect(H.hasAction(master, "users.get")).toBe(true);

				// Check visibility
				expect(H.hasAction(master, "users.update")).toBe(false);
				expect(H.hasAction(node1, "users.update")).toBe(true);
				expect(H.hasAction(node1, "users.remove")).toBe(false);
				expect(node1.getLocalService("users").actions.remove).toBeInstanceOf(Function);

				expect(H.getActionNodes(master, "users.find")).toEqual(["node-1"]);
				expect(H.getActionNodes(master, "users.get")).toEqual(["node-1"]);

				expect(H.getActionNodes(master, "$node.list")).toEqual(["master", "node-1"]);

				expect(H.getEventNodes(master, "user.created")).toEqual(["node-1"]);

				expect(servicesChanged).toHaveBeenCalledTimes(1);
			});
	});

	it("start node2 with userService & payment service", () => {
		servicesChanged.mockClear();

		return node2
			.start()
			.delay(2000)
			.then(() => {
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

				expect(H.getActionNodes(master, "$node.list")).toEqual([
					"master",
					"node-1",
					"node-2"
				]);

				expect(H.getEventNodes(master, "user.created")).toEqual(["node-1", "node-2"]);
				expect(H.getEventNodes(master, "user.paid")).toEqual(["node-2"]);

				expect(servicesChanged).toHaveBeenCalledTimes(1);
			});
	});

	it("stop node2", () => {
		servicesChanged.mockClear();

		return node2
			.stop()
			.delay(2000)
			.then(() => {
				let infoNode2 = H.getNode(master, "node-2");
				expect(infoNode2).toBeDefined();
				expect(infoNode2.available).toBe(false);
				expect(H.hasService(master, "payments")).toBe(false);
				expect(H.getActionNodes(master, "payments.charge")).toEqual([]);
				expect(H.getActionNodes(master, "payments.checkCard")).toEqual([]);
				expect(H.getActionNodes(node1, "payments.checkCard")).toEqual([]);

				expect(H.getActionNodes(master, "users.find")).toEqual(["node-1"]);
				expect(H.getActionNodes(master, "users.get")).toEqual(["node-1"]);

				expect(H.getActionNodes(master, "$node.list")).toEqual(["master", "node-1"]);

				expect(H.getEventNodes(master, "user.created")).toEqual(["node-1"]);
				expect(H.getEventNodes(master, "user.paid")).toEqual([]);

				expect(servicesChanged).toHaveBeenCalledTimes(1);
			});
	});

	it("node2 recreate with posts, paymentMod", () => {
		servicesChanged.mockClear();

		node2 = H.createNode({ namespace: "first", nodeID: "node-2" }, [
			paymentModService,
			postService
		]);

		return node2
			.start()
			.delay(2000)
			.then(() => {
				let infoNode2 = H.getNode(master, "node-2");
				expect(infoNode2).toBeDefined();
				expect(infoNode2.services.length).toBe(3);
				expect(infoNode2.available).toBe(true);
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

				expect(servicesChanged).toHaveBeenCalledTimes(1);
			});
	});

	it("load mail on-the-fly to node1", () => {
		servicesChanged.mockClear();
		H.addServices(node1, [mailService]);

		return Promise.resolve()
			.delay(2000)
			.then(() => {
				expect(H.hasService(master, "mail")).toBe(true);
				expect(H.getActionNodes(master, "mail.send")).toEqual(["node-1"]);
				expect(servicesChanged).toHaveBeenCalledTimes(1);
			});
	});

	it("destroy mail on-the-fly to node1", () => {
		servicesChanged.mockClear();
		H.removeServices(node1, ["mail"]);

		return Promise.resolve()
			.delay(2000)
			.then(() => {
				expect(H.hasService(master, "mail")).toBe(false);
				expect(H.getActionNodes(master, "mail.send")).toEqual([]);
				expect(servicesChanged).toHaveBeenCalledTimes(1);
			});
	});
});

describe("Test action visibilities", () => {
	const master = H.createNode({ namespace: "second", nodeID: "master" }, []);
	const node1 = H.createNode({ namespace: "second", nodeID: "node-1" }, [userService]);

	beforeAll(() => Promise.all([master.start(), node1.start(), Promise.resolve().delay(2000)]));
	afterAll(() => Promise.all([master.stop(), node1.stop()]));

	it("should call remotely", () => {
		return Promise.all([
			master
				.call("users.find")
				.catch(protectReject)
				.then(res => expect(res).toBe("Found")),
			master
				.call("users.get")
				.catch(protectReject)
				.then(res => expect(res).toBe("Got")),
			master
				.call("users.update")
				.then(protectReject)
				.catch(err => expect(err).toBeInstanceOf(E.ServiceNotFoundError)),
			master
				.call("users.remove")
				.then(protectReject)
				.catch(err => expect(err).toBeInstanceOf(E.ServiceNotFoundError))
		]);
	});

	it("should call locally", () => {
		return Promise.all([
			node1
				.call("users.find")
				.catch(protectReject)
				.then(res => expect(res).toBe("Found")),
			node1
				.call("users.get")
				.catch(protectReject)
				.then(res => expect(res).toBe("Got")),
			node1
				.call("users.update")
				.catch(protectReject)
				.then(res => expect(res).toBe("Updated")),
			node1
				.call("users.remove")
				.then(protectReject)
				.catch(err => expect(err).toBeInstanceOf(E.ServiceNotFoundError))
		]);
	});

	it("should call directly inside action", () => {
		return node1
			.call("users.removeWrap")
			.catch(protectReject)
			.then(res => expect(res).toBe("Removed"));
	});
});
