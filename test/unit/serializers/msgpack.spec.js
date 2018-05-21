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

	it("should serialize the event packet", () => {
		const obj = {
			ver: "3",
			sender: "test-1",
			event: "user.created",
			data: {
				a: 5,
				b: "Test"
			},
			broadcast: true
		};
		const s = serializer.serialize(cloneDeep(obj), P.PACKET_EVENT);
		expect(s.length).toBe(67);

		const res = serializer.deserialize(s, P.PACKET_EVENT);
		expect(res).not.toBe(obj);
		expect(res).toEqual(obj);

	});

});
