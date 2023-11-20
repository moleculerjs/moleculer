const MsgPackSerializer = require("../../../src/serializers/msgpack");
const { cloneDeep } = require("lodash");
const P = require("../../../src/packets");

describe("Test MsgPackSerializer constructor", () => {
	it("should create an empty options", () => {
		let serializer = new MsgPackSerializer();
		expect(serializer).toBeDefined();
		expect(serializer.serialize).toBeDefined();
		expect(serializer.deserialize).toBeDefined();
	});
});

describe("Test MsgPackSerializer", () => {
	let serializer = new MsgPackSerializer();
	serializer.init();

	it("should serialize the event packet (with UTC String)", () => {
		const now = new Date().toUTCString();
		const obj = {
			ver: "5",
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
		expect(s.length).toBe(164);

		const res = serializer.deserialize(s, P.PACKET_EVENT);
		expect(res).not.toBe(obj);
		expect(res).toEqual(obj);
	});
	it("should serialize the event packet (date time ends 000Z using UTC)", () => {
		const now = new Date("2022-11-06T22:59:47.000Z").toUTCString();
		const obj = {
			ver: "5",
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
		expect(s.length).toBe(164);

		const res = serializer.deserialize(s, P.PACKET_EVENT);
		expect(res).not.toBe(obj);
		expect(res).toEqual(obj);
	});

	it("should serialize the event packet (date time ends with 001Z and using UTC)", () => {
		const now = new Date("2022-11-06T22:59:47.001Z").toUTCString();
		const obj = {
			ver: "5",
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
		expect(s.length).toBe(164);

		const res = serializer.deserialize(s, P.PACKET_EVENT);
		expect(res).not.toBe(obj);
		expect(res).toEqual(obj);
	});

	it("should serialize the event packet (date time ends with 000Z without UTC)", () => {
		const now = new Date("2022-11-06T22:59:47.000Z");
		const obj = {
			ver: "5",
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
		expect(s.length).toBe(140);

		const res = serializer.deserialize(s, P.PACKET_EVENT);
		expect(res).not.toBe(obj);
		expect(res).toEqual(obj);
	});

	it("should serialize the event packet (date time ends with 001Z without UTC)", () => {
		const now = new Date("2022-11-06T22:59:47.001Z");
		const obj = {
			ver: "5",
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
		expect(s.length).toBe(144);

		const res = serializer.deserialize(s, P.PACKET_EVENT);
		expect(res).not.toBe(obj);
		expect(res).toEqual(obj);
	});
});
