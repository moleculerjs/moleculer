/* eslint-disable no-console */
"use strict";

const ServiceBroker = require("../../src/service-broker");
const Serializers = require("../../src/serializers");
const P = require("../../src/packets");
const crypto = require("crypto");
const _ = require("lodash");

const { getDataFile } = require("../utils");

const Benchmarkify = require("benchmarkify");
const benchmark = new Benchmarkify("Serializers benchmark").printHeader();

let dataFiles = ["10", "1k", "50k", "100k", "buf-10240", "buf-102400"];

function runTest(dataName) {
	let payload = !dataName.startsWith("buf-")
		? JSON.parse(getDataFile(dataName + ".json"))
		: crypto.randomBytes(parseInt(dataName.substr(4)));

	const broker = new ServiceBroker({ logger: false });

	let JsonSer = new Serializers.JSON();
	let JsonExtSer = new Serializers.JSONExt();
	let MsgPackSer = new Serializers.MsgPack();
	let notepackSer = new Serializers.Notepack();
	let cborSer = new Serializers.CBOR();

	JsonSer.init(broker);
	JsonExtSer.init(broker);
	MsgPackSer.init(broker);
	notepackSer.init(broker);
	cborSer.init(broker);

	let bench1 = benchmark.createSuite(`Serialize packet with ${dataName}bytes`);

	const packet = new P.Packet(P.PACKET_EVENT, "node-101", {
		ver: "4",
		sender: "node-100",
		id: "8b3c7371-7f0a-4aa2-b734-70ede29e1bbb",
		event: "user.created",
		data: payload,
		broadcast: true,
		meta: {},
		level: 1,
		needAck: false
	});

	bench1.ref("JSON", () => {
		const packet = new P.Packet(P.PACKET_EVENT, "node-101", {
			ver: "4",
			sender: "node-100",
			id: "8b3c7371-7f0a-4aa2-b734-70ede29e1bbb",
			event: "user.created",
			data: payload,
			broadcast: true,
			meta: {},
			level: 1,
			needAck: false
		});
		return JsonSer.serialize(packet.payload, packet.type);
	});

	bench1.add("JSONExt", () => {
		const packet = new P.Packet(P.PACKET_EVENT, "node-101", {
			ver: "4",
			sender: "node-100",
			id: "8b3c7371-7f0a-4aa2-b734-70ede29e1bbb",
			event: "user.created",
			data: payload,
			broadcast: true,
			meta: {},
			level: 1,
			needAck: false
		});
		return JsonExtSer.serialize(packet.payload, packet.type);
	});

	/*function circularSerialize(obj) {
		const cache = new WeakSet();
		return JSON.stringify(obj, (key, value) => {
			if (typeof value === "object" && value !== null) {
				if (cache.has(value)) {
					return "[Circular]";
				}
				cache.add(value);
			}
			return value;
		});
	}

	bench1.add("JSON (circular)", () => {
		const packet = new P.Packet(P.PACKET_EVENT, "node-101", {
			ver:"4",
			sender: "node-100",
			id: "8b3c7371-7f0a-4aa2-b734-70ede29e1bbb",
			event: "user.created",
			data: payload,
			broadcast: true,
			meta: {},
			level: 1,
			needAck: false

		});
		return circularSerialize(packet.payload, packet.type);
	});*/

	bench1.add("MsgPack", () => {
		const packet = new P.Packet(P.PACKET_EVENT, "node-101", {
			ver: "4",
			sender: "node-100",
			id: "8b3c7371-7f0a-4aa2-b734-70ede29e1bbb",
			event: "user.created",
			data: payload,
			broadcast: true,
			meta: {},
			level: 1,
			needAck: false
		});
		return MsgPackSer.serialize(packet.payload, packet.type);
	});

	bench1.add("Notepack", () => {
		const packet = new P.Packet(P.PACKET_EVENT, "node-101", {
			ver: "4",
			sender: "node-100",
			id: "8b3c7371-7f0a-4aa2-b734-70ede29e1bbb",
			event: "user.created",
			data: payload,
			broadcast: true,
			meta: {},
			level: 1,
			needAck: false
		});
		return notepackSer.serialize(packet.payload, packet.type);
	});

	bench1.add("CBOR", () => {
		const packet = new P.Packet(P.PACKET_EVENT, "node-101", {
			ver: "4",
			sender: "node-100",
			id: "8b3c7371-7f0a-4aa2-b734-70ede29e1bbb",
			event: "user.created",
			data: payload,
			broadcast: true,
			meta: {},
			level: 1,
			needAck: false
		});
		return cborSer.serialize(packet.payload, packet.type);
	});

	console.log("JSON length:", JsonSer.serialize(_.cloneDeep(packet.payload), packet.type).length);
	console.log(
		"JSONExt length:",
		JsonExtSer.serialize(_.cloneDeep(packet.payload), packet.type).length
	);
	console.log(
		"MsgPack length:",
		MsgPackSer.serialize(_.cloneDeep(packet.payload), packet.type).length
	);
	console.log(
		"Notepack length:",
		notepackSer.serialize(_.cloneDeep(packet.payload), packet.type).length
	);
	console.log("CBOR length:", cborSer.serialize(_.cloneDeep(packet.payload), packet.type).length);

	return bench1.run().then(() => {
		if (dataFiles.length > 0) return runTest(dataFiles.shift());
	});
}

runTest(dataFiles.shift());

/*

=========================
  Serializers benchmark
=========================

Platform info:
==============
   Windows_NT 10.0.19043 x64
   Node.JS: 14.19.0
   V8: 8.4.371.23-node.85
   CPU: Intel(R) Core(TM) i7-4770K CPU @ 3.50GHz × 8
   Memory: 32 GB

JSON length: 169
JSONExt length: 169
MsgPack length: 126
Notepack length: 126
CBOR length: 133
Suite: Serialize packet with 10bytes
√ JSON               521 065 rps
√ JSONExt            221 927 rps
√ MsgPack             91 100 rps
√ Notepack           581 182 rps
√ CBOR             1 096 399 rps

   JSON (#)            0%        (521 065 rps)   (avg: 1μs)
   JSONExt        -57,41%        (221 927 rps)   (avg: 4μs)
   MsgPack        -82,52%         (91 100 rps)   (avg: 10μs)
   Notepack       +11,54%        (581 182 rps)   (avg: 1μs)
   CBOR          +110,42%      (1 096 399 rps)   (avg: 912ns)
-----------------------------------------------------------------------

JSON length: 1211
JSONExt length: 1211
MsgPack length: 1081
Notepack length: 1081
CBOR length: 1096
Suite: Serialize packet with 1kbytes
√ JSON               144 653 rps
√ JSONExt             64 124 rps
√ MsgPack             17 516 rps
√ Notepack           135 953 rps
√ CBOR               218 752 rps

   JSON (#)            0%        (144 653 rps)   (avg: 6μs)
   JSONExt        -55,67%         (64 124 rps)   (avg: 15μs)
   MsgPack        -87,89%         (17 516 rps)   (avg: 57μs)
   Notepack        -6,01%        (135 953 rps)   (avg: 7μs)
   CBOR           +51,23%        (218 752 rps)   (avg: 4μs)
-----------------------------------------------------------------------

JSON length: 50681
JSONExt length: 50681
MsgPack length: 46725
Notepack length: 46725
CBOR length: 47155
Suite: Serialize packet with 50kbytes
√ JSON                 4 892 rps
√ JSONExt              2 129 rps
√ MsgPack                511 rps
√ Notepack             3 904 rps
√ CBOR                 6 197 rps

   JSON (#)            0%          (4 892 rps)   (avg: 204μs)
   JSONExt        -56,47%          (2 129 rps)   (avg: 469μs)
   MsgPack        -89,55%            (511 rps)   (avg: 1ms)
   Notepack       -20,19%          (3 904 rps)   (avg: 256μs)
   CBOR           +26,68%          (6 197 rps)   (avg: 161μs)
-----------------------------------------------------------------------

JSON length: 101180
JSONExt length: 101180
MsgPack length: 93311
Notepack length: 93311
CBOR length: 94166
Suite: Serialize packet with 100kbytes
√ JSON                 2 553 rps
√ JSONExt              1 101 rps
√ MsgPack                248 rps
√ Notepack             2 007 rps
√ CBOR                 3 176 rps

   JSON (#)            0%          (2 553 rps)   (avg: 391μs)
   JSONExt        -56,88%          (1 101 rps)   (avg: 908μs)
   MsgPack        -90,29%            (248 rps)   (avg: 4ms)
   Notepack       -21,38%          (2 007 rps)   (avg: 498μs)
   CBOR           +24,44%          (3 176 rps)   (avg: 314μs)
-----------------------------------------------------------------------

JSON length: 36873
JSONExt length: 13823
MsgPack length: 10364
Notepack length: 10364
CBOR length: 10368
Suite: Serialize packet with buf-10240bytes
√ JSON                 2 042 rps
√ JSONExt             14 457 rps
√ MsgPack             67 665 rps
√ Notepack           277 208 rps
√ CBOR               431 623 rps

   JSON (#)            0%          (2 042 rps)   (avg: 489μs)
   JSONExt       +608,16%         (14 457 rps)   (avg: 69μs)
   MsgPack       +3 214,42%         (67 665 rps)   (avg: 14μs)
   Notepack      +13 478,41%        (277 208 rps)   (avg: 3μs)
   CBOR          +21 042,1%        (431 623 rps)   (avg: 2μs)
-----------------------------------------------------------------------

JSON length: 365507
JSONExt length: 136703
MsgPack length: 102526
Notepack length: 102526
CBOR length: 102530
Suite: Serialize packet with buf-102400bytes
√ JSON                   192 rps
√ JSONExt                949 rps
√ MsgPack             23 916 rps
√ Notepack            72 199 rps
√ CBOR                81 746 rps

   JSON (#)            0%            (192 rps)   (avg: 5ms)
   JSONExt       +394,75%            (949 rps)   (avg: 1ms)
   MsgPack       +12 370,6%         (23 916 rps)   (avg: 41μs)
   Notepack      +37 547,1%         (72 199 rps)   (avg: 13μs)
   CBOR          +42 524,7%         (81 746 rps)   (avg: 12μs)
-----------------------------------------------------------------------


*/
