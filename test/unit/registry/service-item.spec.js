"use strict";

let ServiceItem = require("../../../src/registry/service-item");

describe("Test ServiceItem without version", () => {

	let node = { id: "server-1" };

	const serviceDef = {
		name: "posts",
		fullName: "posts",
		version: undefined,
		settings: { a: 5 },
		metadata: { tag: 1 }
	};

	let svc;

	it("should create new ServiceItem", () => {
		svc = new ServiceItem(node, serviceDef, false);

		expect(svc).toBeDefined();
		expect(svc.node).toBe(node);
		expect(svc.name).toBe("posts");
		expect(svc.version).toBeUndefined();
		expect(svc.settings).toBe(serviceDef.settings);
		expect(svc.metadata).toBe(serviceDef.metadata);
		expect(svc.local).toBe(false);
		expect(svc.actions).toEqual({});
		expect(svc.events).toEqual({});
	});

	it("should check equals services", () => {
		expect(svc.equals("posts")).toBe(true);
		expect(svc.equals("v2.posts")).toBe(false);
		expect(svc.equals("posts", "server-1")).toBe(true);
		expect(svc.equals("v2.posts", "server-1")).toBe(false);
		expect(svc.equals("posts", "server-2")).toBe(false);
		expect(svc.equals("users", "server-1")).toBe(false);
		expect(svc.equals("v2.users", "server-1")).toBe(false);
		expect(svc.equals("users", "server-2")).toBe(false);
	});

	it("should update props", () => {
		svc.update({ fullName: "v2.posts", version: 2, settings: { b: 3 }, metadata: { scalable: true } });
		expect(svc.fullName).toBe("v2.posts");
		expect(svc.version).toBe(2);
		expect(svc.settings).toEqual({ b: 3 });
		expect(svc.metadata).toEqual({ scalable: true });
	});

	it("should add actions", () => {
		expect(Object.keys(svc.actions).length).toBe(0);
		svc.addAction({ name: "posts.find" });
		expect(Object.keys(svc.actions).length).toBe(1);
	});

	it("should add events", () => {
		expect(Object.keys(svc.events).length).toBe(0);
		svc.addEvent({ name: "user.created" });
		expect(Object.keys(svc.events).length).toBe(1);
	});

});

describe("Test ServiceItem with version", () => {

	let node = { id: "server-1" };
	const serviceDef = {
		name: "posts",
		fullName: "v4.posts",
		version: 4,
		settings: { a: 5 },
		metadata: { tag: 1 }
	};
	let svc;

	it("should create new ServiceItem", () => {
		svc = new ServiceItem(node, serviceDef, true);

		expect(svc).toBeDefined();
		expect(svc.node).toBe(node);
		expect(svc.name).toBe("posts");
		expect(svc.fullName).toBe("v4.posts");
		expect(svc.version).toBe(4);
		expect(svc.settings).toBe(serviceDef.settings);
		expect(svc.metadata).toBe(serviceDef.metadata);
		expect(svc.local).toBe(true);
		expect(svc.actions).toEqual({});
		expect(svc.events).toEqual({});
	});

	it("should check equals services", () => {
		expect(svc.equals("v4.posts")).toBe(true);
		expect(svc.equals("v2.posts")).toBe(false);
		expect(svc.equals("posts")).toBe(false);
		expect(svc.equals("v4.posts", "server-1")).toBe(true);
		expect(svc.equals("posts", "server-1")).toBe(false);
		expect(svc.equals("v4.posts", "server-2")).toBe(false);
		expect(svc.equals("v4.users", "server-1")).toBe(false);
		expect(svc.equals("v4.users", "server-1")).toBe(false);
		expect(svc.equals("v4.users", "server-2")).toBe(false);
	});

	it("should update props", () => {
		svc.update({ fullName: "v2.posts", version: 2, settings: { b: 3 }, metadata: { scalable: true } });
		expect(svc.fullName).toBe("v2.posts");
		expect(svc.version).toBe(2);
		expect(svc.settings).toEqual({ b: 3 });
		expect(svc.metadata).toEqual({ scalable: true });
	});
});
