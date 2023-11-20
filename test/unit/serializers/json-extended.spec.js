const { cloneDeep } = require("lodash");
const crypto = require("crypto");
const P = require("../../../src/packets");
const JSONExtSerializer = require("../../../src/serializers/json-extended");

describe("Test JSONExtSerializer constructor", () => {
	it("should create an empty options", () => {
		let serializer = new JSONExtSerializer();
		expect(serializer).toBeDefined();
		expect(serializer.serialize).toBeDefined();
		expect(serializer.deserialize).toBeDefined();
	});

	it("should create with options", () => {
		let serializer = new JSONExtSerializer({
			customs: [
				{
					prefix: "AB"
				}
			]
		});
		expect(serializer).toBeDefined();
		expect(serializer.opts).toEqual({ customs: [{ prefix: "AB" }] });
		expect(serializer.hasCustomTypes).toBe(true);
		expect(serializer.serialize).toBeDefined();
		expect(serializer.deserialize).toBeDefined();
	});
});

class MyClass {
	constructor(a, b) {
		this.a = a;
		this.b = b;
	}
}

describe("Test JSONExtSerializer", () => {
	let serializer = new JSONExtSerializer({
		customs: [
			{
				prefix: "AB",
				check: v => v instanceof MyClass,
				serialize: v => v.a + "|" + v.b,
				deserialize: v => {
					const [a, b] = v.split("|");
					return new MyClass(parseInt(a), b);
				}
			}
		]
	});
	serializer.init();

	it("should serialize bigint data", () => {
		const now = new Date();
		const obj = {
			a: 5,
			b: 98765432123456789n
		};

		const s = serializer.serialize(obj);
		expect(s.toString()).toBe(`{"a":5,"b":"[[BI]]98765432123456789"}`);

		const res = serializer.deserialize(s);
		expect(res).not.toBe(obj);
		expect(res).toEqual(obj);
	});

	it("should serialize Date data", () => {
		const now = new Date();
		const obj = {
			a: now.valueOf(),
			b: now
		};

		const s = serializer.serialize(obj);
		expect(s.toString()).toBe(`{"a":${now.valueOf()},"b":"[[DT]]${now.valueOf()}"}`);

		const res = serializer.deserialize(s);
		expect(res).not.toBe(obj);
		expect(res).toEqual(obj);
	});

	it("should serialize Map data", () => {
		const now = new Date(1675191894523);
		const map = new Map();
		map.set("a", 5);
		map.set("b", 98765432123456789n);
		map.set("c", now);

		const obj = {
			map,
			d: "John"
		};

		const s = serializer.serialize(obj);
		expect(s.toString()).toBe(
			// eslint-disable-next-line no-useless-escape
			`{\"map\":\"[[MP]]{\\\"a\\\":5,\\\"b\\\":\\\"[[BI]]98765432123456789\\\",\\\"c\\\":\\\"[[DT]]1675191894523\\\"}\",\"d\":\"John\"}`
		);

		const res = serializer.deserialize(s);
		expect(res).not.toBe(obj);
		expect(res).toEqual(obj);
		expect(res.map).toBeInstanceOf(Map);
	});

	it("should serialize Set data", () => {
		const now = new Date(1675191894523);
		const set = new Set();
		set.add(5);
		set.add(98765432123456789n);
		set.add(now);

		const obj = {
			set,
			d: "John"
		};

		const s = serializer.serialize(obj);
		expect(s.toString()).toBe(
			// eslint-disable-next-line no-useless-escape
			`{\"set\":\"[[ST]][5,\\\"[[BI]]98765432123456789\\\",\\\"[[DT]]1675191894523\\\"]\",\"d\":\"John\"}`
		);

		const res = serializer.deserialize(s);
		expect(res).not.toBe(obj);
		expect(res).toEqual(obj);
		expect(res.set).toBeInstanceOf(Set);
	});

	it("should serialize Buffer data", () => {
		const buf = crypto.randomBytes(20);
		const base64 = buf.toString("base64");
		const obj = {
			a: buf
		};

		const s = serializer.serialize(obj);
		expect(s.toString()).toBe(`{"a":"[[BF]]${base64}"}`);

		const res = serializer.deserialize(s);
		expect(res).not.toBe(obj);
		expect(res).toEqual(obj);
	});

	it("should serialize RegExp data", () => {
		const re = /^[a-z|A-Z]+$/i;
		const obj = {
			re
		};

		const s = serializer.serialize(obj);
		expect(s.toString()).toBe(`{"re":"[[RE]]i|^[a-z|A-Z]+$"}`);

		const res = serializer.deserialize(s);
		expect(res).not.toBe(obj);
		expect(res).toEqual(obj);
	});

	it("should serialize custom class", () => {
		const re = /^[a-z|A-Z]+$/i;
		const obj = {
			clazz: new MyClass(5, "John")
		};

		const s = serializer.serialize(obj);
		expect(s.toString()).toBe(`{"clazz":"[[AB]]5|John"}`);

		const res = serializer.deserialize(s);
		expect(res).not.toBe(obj);
		expect(res.clazz).toBeInstanceOf(MyClass);
		expect(res.clazz.a).toBe(5);
		expect(res.clazz.b).toBe("John");
	});

	it("should serialize the event packet", () => {
		const obj = {
			ver: "5",
			sender: "node-100",
			id: "8b3c7371-7f0a-4aa2-b734-70ede29e1bbb",
			event: "user.created",
			data: {
				a: 5,
				b: "Test"
			},
			broadcast: true,
			meta: {},
			level: 1,
			needAck: false
		};
		const s = serializer.serialize(cloneDeep(obj), P.PACKET_EVENT);
		expect(s.length).toBe(177);

		const res = serializer.deserialize(s, P.PACKET_EVENT);
		expect(res).not.toBe(obj);
		expect(res).toEqual(obj);
	});
});
