"use strict";

let ServiceItem = require("../../../src/registry/service-item");

describe("Test ServiceItem without version", () => {

	let node = { id: "server-1" };
	let settings = { a: 5 };
	let metadata = { tag: 1 };
	let svc;

	it("should create new ServiceItem", () => {
		svc = new ServiceItem(node, "posts", undefined, settings, metadata, false);

		expect(svc).toBeDefined();
		expect(svc.node).toBe(node);
		expect(svc.name).toBe("posts");
		expect(svc.version).toBeUndefined();
		expect(svc.settings).toBe(settings);
		expect(svc.metadata).toBe(metadata);
		expect(svc.local).toBe(false);
		expect(svc.actions).toEqual({});
		expect(svc.events).toEqual({});
	});

	it("should check equals services", () => {
		expect(svc.equals("posts", undefined)).toBe(true);
		expect(svc.equals("posts", 2)).toBe(false);
		expect(svc.equals("posts", undefined, "server-1")).toBe(true);
		expect(svc.equals("posts", 2, "server-1")).toBe(false);
		expect(svc.equals("posts", undefined, "server-2")).toBe(false);
		expect(svc.equals("users", undefined, "server-1")).toBe(false);
		expect(svc.equals("users", 2, "server-1")).toBe(false);
		expect(svc.equals("users", undefined, "server-2")).toBe(false);
	});

	it("should update props", () => {
		svc.update({ version: 2, settings: { b: 3 }, metadata: { scalable: true } });
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
	let settings = { a: 5 };
	let metadata = { tag: 1 };
	let svc;

	it("should create new ServiceItem", () => {
		svc = new ServiceItem(node, "posts", 4, settings, metadata, true);

		expect(svc).toBeDefined();
		expect(svc.node).toBe(node);
		expect(svc.name).toBe("posts");
		expect(svc.version).toBe(4);
		expect(svc.settings).toBe(settings);
		expect(svc.metadata).toBe(metadata);
		expect(svc.local).toBe(true);
		expect(svc.actions).toEqual({});
		expect(svc.events).toEqual({});
	});

	it("should check equals services", () => {
		expect(svc.equals("posts", 4)).toBe(true);
		expect(svc.equals("posts", 2)).toBe(false);
		expect(svc.equals("posts", undefined)).toBe(false);
		expect(svc.equals("posts", 4, "server-1")).toBe(true);
		expect(svc.equals("posts", undefined, "server-1")).toBe(false);
		expect(svc.equals("posts", 4, "server-2")).toBe(false);
		expect(svc.equals("users", 4, "server-1")).toBe(false);
		expect(svc.equals("users", 2, "server-1")).toBe(false);
		expect(svc.equals("users", 4, "server-2")).toBe(false);
	});

	it("should update props", () => {
		svc.update({ version: 2, settings: { b: 3 }, metadata: { scalable: true } });
		expect(svc.version).toBe(2);
		expect(svc.settings).toEqual({ b: 3 });
		expect(svc.metadata).toEqual({ scalable: true });
	});
});
