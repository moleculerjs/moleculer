const P = require("../../src/packets");

describe("Test base Packet", () => {

	it("create Packet without type", () => {
		let packet = new P.Packet();
		expect(packet).toBeDefined();
		expect(packet.type).toBe(P.PACKET_UNKNOW);
		expect(packet.target).toBeUndefined();
		expect(packet.payload).toEqual({});
	});

	it("create Packet with type & target", () => {
		let packet = new P.Packet(P.PACKET_EVENT, "node-2");
		expect(packet).toBeDefined();
		expect(packet.type).toBe(P.PACKET_EVENT);
		expect(packet.target).toBe("node-2");
		expect(packet.payload).toEqual({});
	});

	it("create Packet with type & target & payload", () => {
		let packet = new P.Packet(P.PACKET_EVENT, "node-2", { a: 5 });
		expect(packet).toBeDefined();
		expect(packet.type).toBe(P.PACKET_EVENT);
		expect(packet.target).toBe("node-2");
		expect(packet.payload).toBeDefined();
		expect(packet.payload.a).toBe(5);
	});

});

