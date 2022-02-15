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
});

describe("Test JSONExtSerializer", () => {
	let serializer = new JSONExtSerializer();
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

	it("should serialize the event packet", () => {
		const obj = {
			ver: "4",
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
