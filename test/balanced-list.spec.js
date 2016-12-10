"use strict";

const BalancedList = require("../src/balanced-list");

describe("Test BalancedList", () => {

	it("test constructor", () => {
		let list = new BalancedList(1);
		expect(list).toBeDefined();
		expect(list.list).toBeDefined();
		expect(list.mode).toBe(1);
		expect(list.counter).toBe(0);

		expect(list.get()).toBeNull();
	});

	it("test add & get & remove", () => {
		let obj1 = {};
		let obj2 = {};
		let list = new BalancedList();
		list.add(obj1);
		list.add(obj2, 20);
		expect(list.counter).toBe(0);
		expect(list.get()).toBe(obj1);
		expect(list.counter).toBe(1);
		expect(list.get()).toBe(obj2);
		expect(list.counter).toBe(2);
		expect(list.get()).toBe(obj1);
		expect(list.counter).toBe(1);
		
		list.remove(obj1);
		expect(list.get()).toBe(obj2);
		expect(list.counter).toBe(1);
		expect(list.get()).toBe(obj2);
		expect(list.counter).toBe(1);
	
	});

});
