const CborSerializer = require("../../../src/serializers/cbor");
const { cloneDeep } = require("lodash");
const P = require("../../../src/packets");

describe("Test CborSerializer constructor", () => {
	it("should create an empty options", () => {
		let serializer = new CborSerializer();
		expect(serializer).toBeDefined();
		expect(serializer.serialize).toBeDefined();
		expect(serializer.deserialize).toBeDefined();
	});
});

describe("Test CborSerializer", () => {
	let serializer = new CborSerializer();
	serializer.init();

	it("should serialize the event packet with locale date time string", () => {
		const now = new Date().toLocaleString();
		const obj = {
			ver: "4",
			sender: "node-100",
			id: "8b3c7371-7f0a-4aa2-b734-70ede29e1bbb",
			event: "user.created",
			data: {
				a: 5,
				b: "Test",
				c: now
			},
			broadcast: true,
			meta: {},
			level: 1,
			needAck: false
		};
		const s = serializer.serialize(cloneDeep(obj), P.PACKET_EVENT);
		expect(s.length).toBe(162);

		const res = serializer.deserialize(s, P.PACKET_EVENT);
		expect(res).not.toBe(obj);
		expect(res).toEqual(obj);
	});

	it("should serialize the event packet with locale date time string (with 000Z)", () => {
		const now = new Date("2022-11-06T22:59:47.000Z").toLocaleString();
		const obj = {
			ver: "4",
			sender: "node-100",
			id: "8b3c7371-7f0a-4aa2-b734-70ede29e1bbb",
			event: "user.created",
			data: {
				a: 5,
				b: "Test",
				c: now
			},
			broadcast: true,
			meta: {},
			level: 1,
			needAck: false
		};
		const s = serializer.serialize(cloneDeep(obj), P.PACKET_EVENT);
		expect(s.length).toBe(162);

		const res = serializer.deserialize(s, P.PACKET_EVENT);
		expect(res).not.toBe(obj);
		expect(res).toEqual(obj);
	});

	it("should serialize the event packet with locale date time string (with more than 000Z)", () => {
		const now = new Date("2022-11-06T22:59:47.001Z").toLocaleString();
		const obj = {
			ver: "4",
			sender: "node-100",
			id: "8b3c7371-7f0a-4aa2-b734-70ede29e1bbb",
			event: "user.created",
			data: {
				a: 5,
				b: "Test",
				c: now
			},
			broadcast: true,
			meta: {},
			level: 1,
			needAck: false
		};
		const s = serializer.serialize(cloneDeep(obj), P.PACKET_EVENT);
		expect(s.length).toBe(162);

		const res = serializer.deserialize(s, P.PACKET_EVENT);
		expect(res).not.toBe(obj);
		expect(res).toEqual(obj);
	});

	it("should serialize the event packet with flaky date time string", () => {
		const now = new Date("2022-11-06T22:59:47.000Z");
		const obj = {
			ver: "4",
			sender: "node-100",
			id: "8b3c7371-7f0a-4aa2-b734-70ede29e1bbb",
			event: "user.created",
			data: {
				a: 5,
				b: "Test",
				c: now
			},
			broadcast: true,
			meta: {},
			level: 1,
			needAck: false
		};
		const s = serializer.serialize(cloneDeep(obj), P.PACKET_EVENT);
		expect(s.length).toBe(146);

		const res = serializer.deserialize(s, P.PACKET_EVENT);
		expect(res).not.toBe(obj);
		expect(res).toEqual(obj);
	});

	it("should serialize the event packet", () => {
		const now = new Date("2022-11-06T22:59:47.001Z");
		const obj = {
			ver: "4",
			sender: "node-100",
			id: "8b3c7371-7f0a-4aa2-b734-70ede29e1bbb",
			event: "user.created",
			data: {
				a: 5,
				b: "Test",
				c: now
			},
			broadcast: true,
			meta: {},
			level: 1,
			needAck: false
		};
		const s = serializer.serialize(cloneDeep(obj), P.PACKET_EVENT);
		expect(s.length).toBe(150);

		const res = serializer.deserialize(s, P.PACKET_EVENT);
		expect(res).not.toBe(obj);
		expect(res).toEqual(obj);
	});

	it("should serialize the event packet with flaky date time string", () => {
		const now = new Date("2022-11-06T22:59:47.000Z");
		const obj = {
			ver: "4",
			sender: "node-100",
			id: "8b3c7371-7f0a-4aa2-b734-70ede29e1bbb",
			event: "user.created",
			data: {
				a: 5,
				b: "Test",
				c: now
			},
			broadcast: true,
			meta: {},
			level: 1,
			needAck: false
		};
		const s = serializer.serialize(cloneDeep(obj), P.PACKET_EVENT);
		expect(s.length).toBe(146);

		const res = serializer.deserialize(s, P.PACKET_EVENT);
		expect(res).not.toBe(obj);
		expect(res).toEqual(obj);
	});

	it("should deserialize maps to objects by default", () => {
		const input = new Map([
			["foo", "bar"],
			["baz", "qux"]
		]);
		const s = serializer.serialize(input);
		const res = serializer.deserialize(s);

		expect(res).not.toEqual(input);
		expect(res).toEqual({ foo: "bar", baz: "qux" });
	});

	it("should allow maps to be serialized with mapsAsObjects option false", () => {
		const options = { mapsAsObjects: false };
		const optsSerializer = new CborSerializer(options);
		optsSerializer.init();

		const input = new Map([
			["foo", "bar"],
			["baz", "qux"]
		]);
		const s = optsSerializer.serialize(input);
		const res = optsSerializer.deserialize(s);

		expect(res).toEqual(input);
	});

	it("should allow maps to be serialized with useTag259ForMaps option true", () => {
		const options = { useTag259ForMaps: true };
		const optsSerializer = new CborSerializer(options);
		optsSerializer.init();

		const input = new Map([
			["foo", "bar"],
			["baz", "qux"]
		]);
		const s = optsSerializer.serialize(input);
		const res = optsSerializer.deserialize(s);

		expect(res).toEqual(input);
	});
});
