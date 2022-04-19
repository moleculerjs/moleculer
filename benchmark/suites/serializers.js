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
		: crypto.randomBytes(parseInt(dataName.substring(4)));

	const broker = new ServiceBroker({ logger: false });

	let JsonSer = new Serializers.JSON();
	let AvroSer = new Serializers.Avro();
	let MsgPackSer = new Serializers.MsgPack();
	let protoBufSer = new Serializers.ProtoBuf();
	let thriftSer = new Serializers.Thrift();
	let notepackSer = new Serializers.Notepack();
	let cborSer = new Serializers.CBOR();

	JsonSer.init(broker);
	AvroSer.init(broker);
	MsgPackSer.init(broker);
	protoBufSer.init(broker);
	thriftSer.init(broker);
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

	bench1.add("Avro", () => {
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
		return AvroSer.serialize(packet.payload, packet.type);
	});

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

	bench1.add("ProtoBuf", () => {
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
		return protoBufSer.serialize(packet.payload, packet.type);
	});

	bench1.add("Thrift", () => {
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
		return thriftSer.serialize(packet.payload, packet.type);
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
	console.log("Avro length:", AvroSer.serialize(_.cloneDeep(packet.payload), packet.type).length);
	console.log(
		"MsgPack length:",
		MsgPackSer.serialize(_.cloneDeep(packet.payload), packet.type).length
	);
	console.log(
		"ProtoBuf length:",
		protoBufSer.serialize(_.cloneDeep(packet.payload), packet.type).length
	);
	console.log(
		"Thrift length:",
		thriftSer.serialize(_.cloneDeep(packet.payload), packet.type).length
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
   Windows_NT 6.1.7601 x64
   Node.JS: 8.11.0
   V8: 6.2.414.50
   Intel(R) Core(TM) i7-4770K CPU @ 3.50GHz × 8

JSON length: 169
Avro length: 87
MsgPack length: 126
ProtoBuf length: 90
Thrift length: 134
Notepack length: 126
Suite: Serialize packet with 10bytes
√ JSON               579,367 rps
√ Avro               310,125 rps
√ MsgPack             44,379 rps
√ ProtoBuf           389,871 rps
√ Thrift              62,683 rps
√ Notepack           427,605 rps

   JSON (#)            0%        (579,367 rps)   (avg: 1μs)
   Avro           -46.47%        (310,125 rps)   (avg: 3μs)
   MsgPack        -92.34%         (44,379 rps)   (avg: 22μs)
   ProtoBuf       -32.71%        (389,871 rps)   (avg: 2μs)
   Thrift         -89.18%         (62,683 rps)   (avg: 15μs)
   Notepack       -26.19%        (427,605 rps)   (avg: 2μs)
-----------------------------------------------------------------------

JSON length: 1211
Avro length: 1130
MsgPack length: 1081
ProtoBuf length: 1133
Thrift length: 1176
Notepack length: 1081
Suite: Serialize packet with 1kbytes
√ JSON               146,389 rps
√ Avro               101,556 rps
√ MsgPack             14,739 rps
√ ProtoBuf           116,900 rps
√ Thrift              45,601 rps
√ Notepack           102,082 rps

   JSON (#)            0%        (146,389 rps)   (avg: 6μs)
   Avro           -30.63%        (101,556 rps)   (avg: 9μs)
   MsgPack        -89.93%         (14,739 rps)   (avg: 67μs)
   ProtoBuf       -20.14%        (116,900 rps)   (avg: 8μs)
   Thrift         -68.85%         (45,601 rps)   (avg: 21μs)
   Notepack       -30.27%        (102,082 rps)   (avg: 9μs)
-----------------------------------------------------------------------

JSON length: 50681
Avro length: 50601
MsgPack length: 46725
ProtoBuf length: 50604
Thrift length: 50646
Notepack length: 46725
Suite: Serialize packet with 50kbytes
√ JSON                 4,337 rps
√ Avro                 3,863 rps
√ MsgPack                472 rps
√ ProtoBuf             3,881 rps
√ Thrift               3,671 rps
√ Notepack             2,670 rps

   JSON (#)            0%          (4,337 rps)   (avg: 230μs)
   Avro           -10.92%          (3,863 rps)   (avg: 258μs)
   MsgPack        -89.12%            (472 rps)   (avg: 2ms)
   ProtoBuf       -10.51%          (3,881 rps)   (avg: 257μs)
   Thrift         -15.34%          (3,671 rps)   (avg: 272μs)
   Notepack       -38.44%          (2,670 rps)   (avg: 374μs)
-----------------------------------------------------------------------

JSON length: 101180
Avro length: 101100
MsgPack length: 93311
ProtoBuf length: 101103
Thrift length: 101145
Notepack length: 93311
Suite: Serialize packet with 100kbytes
√ JSON                 2,213 rps
√ Avro                 1,997 rps
√ MsgPack                234 rps
√ ProtoBuf             2,014 rps
√ Thrift               1,954 rps
√ Notepack             1,341 rps

   JSON (#)            0%          (2,213 rps)   (avg: 451μs)
   Avro            -9.78%          (1,997 rps)   (avg: 500μs)
   MsgPack        -89.42%            (234 rps)   (avg: 4ms)
   ProtoBuf        -8.99%          (2,014 rps)   (avg: 496μs)
   Thrift         -11.71%          (1,954 rps)   (avg: 511μs)
   Notepack       -39.43%          (1,341 rps)   (avg: 745μs)
-----------------------------------------------------------------------

JSON length: 36772
Avro length: 10319
MsgPack length: 10364
ProtoBuf length: 10321
Thrift length: 10364
Notepack length: 10364
Suite: Serialize packet with buf-10240bytes
√ JSON                 2,222 rps
√ Avro                88,351 rps
√ MsgPack             29,847 rps
√ ProtoBuf            91,665 rps
√ Thrift              49,646 rps
√ Notepack           115,223 rps

   JSON (#)            0%          (2,222 rps)   (avg: 450μs)
   Avro          +3,876.92%         (88,351 rps)   (avg: 11μs)
   MsgPack       +1,243.49%         (29,847 rps)   (avg: 33μs)
   ProtoBuf      +4,026.09%         (91,665 rps)   (avg: 10μs)
   Thrift        +2,134.72%         (49,646 rps)   (avg: 20μs)
   Notepack      +5,086.54%        (115,223 rps)   (avg: 8μs)
-----------------------------------------------------------------------

JSON length: 365804
Avro length: 102479
MsgPack length: 102526
ProtoBuf length: 102482
Thrift length: 102524
Notepack length: 102526
Suite: Serialize packet with buf-102400bytes
√ JSON                   202 rps
√ Avro                13,727 rps
√ MsgPack              7,190 rps
√ ProtoBuf            14,791 rps
√ Thrift              11,875 rps
√ Notepack            14,714 rps

   JSON (#)            0%            (202 rps)   (avg: 4ms)
   Avro          +6,707.38%         (13,727 rps)   (avg: 72μs)
   MsgPack       +3,465.35%          (7,190 rps)   (avg: 139μs)
   ProtoBuf      +7,234.99%         (14,791 rps)   (avg: 67μs)
   Thrift        +5,789.03%         (11,875 rps)   (avg: 84μs)
   Notepack      +7,196.84%         (14,714 rps)   (avg: 67μs)
-----------------------------------------------------------------------


*/
