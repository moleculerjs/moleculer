"use strict";

const { ActionList, STRATEGY_ROUND_ROBIN, STRATEGY_RANDOM } = require("../../src/service-registry");

describe("Test constructor", () => {

	it("should create instance with default options", () => {
		let list = new ActionList();
		expect(list).toBeDefined();
		expect(list.list).toBeDefined();
		expect(list.opts).toEqual({"preferLocal": true, "strategy": STRATEGY_ROUND_ROBIN});
		expect(list.counter).toBe(0);
		expect(list.count()).toBe(0);

		expect(list.get()).toBeNull();
		expect(list.hasLocal()).toBe(false);
	});

	it("should create instance with options", () => {
		let opts = {
			preferLocal: false,
			strategy: STRATEGY_RANDOM
		};
		let list = new ActionList(opts);
		expect(list).toBeDefined();
		expect(list.opts).toEqual({"preferLocal": false, "strategy": STRATEGY_RANDOM});
	});

});

describe("Test Add & get methods with preferLocal = true", () => {
	let obj1 = { a: 1 };
	let obj2 = { b: 2 };
	let obj3 = { c: 3 };
	let list = new ActionList();

	it("should add items and not found local item", () => {
		list.add(obj1, "node1"); // remote
		list.add(obj2, "node2"); // remote

		expect(list.count()).toBe(2);
		expect(list.hasLocal()).toBe(false);
		expect(list.counter).toBe(0);
	});

	it("should add & found local item", () => {
		list.add(obj3); // local

		expect(list.count()).toBe(3);
		expect(list.hasLocal()).toBe(true);
		expect(list.counter).toBe(0);
	});

	it("should return the local item", () => {
		let item = list.get();
		expect(item.local).toBe(true);
		expect(item.nodeID).toBeUndefined();
		expect(item.data).toBe(obj3);
		expect(list.counter).toBe(0);
		expect(list.get().data).toBe(obj3);
		expect(list.counter).toBe(0);
	});

	it("should found the local item", () => {
		let item = list.getLocalItem();
		expect(item.local).toBe(true);
		expect(item.nodeID).toBeUndefined();
		expect(item.data).toBe(obj3);
	});
		
		
	it("remove local item and return the remote items with round-robin", () => {
		list.remove(obj3);
		expect(list.count()).toBe(2);
		expect(list.get().data).toBe(obj1);
		expect(list.counter).toBe(1);
		expect(list.get().data).toBe(obj2);
		expect(list.counter).toBe(2);
		expect(list.get().data).toBe(obj1);
		expect(list.counter).toBe(1);
		expect(list.hasLocal()).toBe(false);
	
		let item = list.getLocalItem();
		expect(item).toBeUndefined();
	});

	it("remove a non-exist node item", () => {
		list.removeByNode("no-id");
		expect(list.count()).toBe(2);
	});

	it("remove an item by node", () => {
		list.removeByNode("node1");
		expect(list.count()).toBe(1);
	});

	it("should not add again the exist data just replace", () => {
		let list = new ActionList();

		list.add(obj1, "node1");
		list.add(obj2, "node1");

		expect(list.count()).toBe(1);
		expect(list.get().data).toBe(obj2);
	});	
});

describe("Test Add & get methods with preferLocal = true", () => {
	let obj1 = { a: 1 };
	let obj2 = { b: 2 };
	let obj3 = { c: 3 };
	let list = new ActionList({ preferLocal: false});

	it("should add items and found local item", () => {
		list.add(obj1, "node1");
		list.add(obj2, "node2");
		list.add(obj3); // local

		expect(list.count()).toBe(3);
		expect(list.hasLocal()).toBe(true);
		expect(list.counter).toBe(0);
	});

	it("should step items with round-robin", () => {
		let item = list.get();
		expect(item.local).toBe(false);
		expect(item.nodeID).toBe("node1");
		expect(item.data).toBe(obj1);
		expect(list.counter).toBe(1);
		expect(list.get().data).toBe(obj2);
		expect(list.counter).toBe(2);
		expect(list.get().data).toBe(obj3);
		expect(list.counter).toBe(3);
		
		list.remove(obj1);
		expect(list.get().data).toBe(obj2);
		expect(list.counter).toBe(1);
		expect(list.get().data).toBe(obj3);
		expect(list.counter).toBe(2);
	});

});

describe("Test getData method", () => {
	let obj1 = { a: 1};
	let obj2 = { b: 5};
	let list = new ActionList({ preferLocal: false });

	it("test getData", () => {
		list.add(obj1);
		list.add(obj2);
		let o = list.getData();
		expect(o).toBe(obj1);

		o = list.getData();
		expect(o).toBe(obj2);
	});

});
