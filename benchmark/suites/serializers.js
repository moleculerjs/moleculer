/* eslint-disable no-console */
"use strict";

const ServiceBroker = require("../../src/service-broker");
const Serializers = require("../../src/serializers");
const P = require("../../src/packets");
const crypto = require("crypto");

const { getDataFile } = require("../utils");

const Benchmarkify = require("benchmarkify");
const benchmark = new Benchmarkify("Serializers benchmark").printHeader();

let dataFiles = ["10", "1k", "50k", "100k", "buf-10240", "buf-102400"];

function runTest(dataName) {

	let payload = !dataName.startsWith("buf-") ? JSON.parse(getDataFile(dataName + ".json")) : crypto.randomBytes(parseInt(dataName.substr(4)));

	const broker = new ServiceBroker({ logger: false });

	let JsonSer = new Serializers.JSON();
	let AvroSer = new Serializers.Avro();
	let MsgPackSer = new Serializers.MsgPack();
	let protoBufSer = new Serializers.ProtoBuf();
	let thriftSer = new Serializers.Thrift();
	let notepackSer = new Serializers.Notepack();

	JsonSer.init(broker);
	AvroSer.init(broker);
	MsgPackSer.init(broker);
	protoBufSer.init(broker);
	thriftSer.init(broker);
	notepackSer.init(broker);

	let bench1 = benchmark.createSuite(`Serialize packet with ${dataName}bytes`);

	const packet = new P.Packet(P.PACKET_EVENT, "node-101", {
		ver:"3",
		sender: "node-100",
		event: "user.created",
		data: payload,
		broadcast: true
	});

	bench1.ref("JSON", () => {
		const packet = new P.Packet(P.PACKET_EVENT, "node-101", {
			ver:"3",
			sender: "node-100",
			event: "user.created",
			data: payload,
			broadcast: true
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
			ver:"3",
			sender: "node-100",
			event: "user.created",
			data: payload,
			broadcast: true
		});
		return circularSerialize(packet.payload, packet.type);
	});*/

	bench1.add("Avro", () => {
		const packet = new P.Packet(P.PACKET_EVENT, "node-101", {
			ver:"3",
			sender: "node-100",
			event: "user.created",
			data: payload,
			broadcast: true
		});
		return AvroSer.serialize(packet.payload, packet.type);
	});

	bench1.add("MsgPack", () => {
		const packet = new P.Packet(P.PACKET_EVENT, "node-101", {
			ver:"3",
			sender: "node-100",
			event: "user.created",
			data: payload,
			broadcast: true
		});
		return MsgPackSer.serialize(packet.payload, packet.type);
	});

	bench1.add("ProtoBuf", () => {
		const packet = new P.Packet(P.PACKET_EVENT, "node-101", {
			ver:"3",
			sender: "node-100",
			event: "user.created",
			data: payload,
			broadcast: true
		});
		return protoBufSer.serialize(packet.payload, packet.type);
	});

	bench1.add("Thrift", () => {
		const packet = new P.Packet(P.PACKET_EVENT, "node-101", {
			ver:"3",
			sender: "node-100",
			event: "user.created",
			data: payload,
			broadcast: true
		});
		return thriftSer.serialize(packet.payload, packet.type);
	});

	bench1.add("Notepack", () => {
		const packet = new P.Packet(P.PACKET_EVENT, "node-101", {
			ver:"3",
			sender: "node-100",
			event: "user.created",
			data: payload,
			broadcast: true
		});
		return notepackSer.serialize(packet.payload, packet.type);
	});

	console.log("JSON length:", JsonSer.serialize(packet.payload, packet.type).length);
	console.log("Avro length:", AvroSer.serialize(packet.payload, packet.type).length);
	console.log("MsgPack length:", MsgPackSer.serialize(packet.payload, packet.type).length);
	console.log("ProtoBuf length:", protoBufSer.serialize(packet.payload, packet.type).length);
	console.log("Thrift length:", thriftSer.serialize(packet.payload, packet.type).length);
	console.log("Notepack length:", notepackSer.serialize(packet.payload, packet.type).length);

	return bench1.run()
		.then(() => {
			if (dataFiles.length > 0)
				return runTest(dataFiles.shift());
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

JSON length: 89
Avro length: 38
MsgPack length: 69
ProtoBuf length: 45
Thrift length: 76
Notepack length: 81
Suite: Serialize packet with 10bytes
√ JSON               803,696 rps
√ Avro               578,574 rps
√ MsgPack             75,582 rps
√ ProtoBuf           745,775 rps
√ Thrift             110,671 rps
√ Notepack           652,254 rps

   JSON (#)            0%        (803,696 rps)   (avg: 1μs)
   Avro           -28.01%        (578,574 rps)   (avg: 1μs)
   MsgPack         -90.6%         (75,582 rps)   (avg: 13μs)
   ProtoBuf        -7.21%        (745,775 rps)   (avg: 1μs)
   Thrift         -86.23%        (110,671 rps)   (avg: 9μs)
   Notepack       -18.84%        (652,254 rps)   (avg: 1μs)
-----------------------------------------------------------------------

JSON length: 1131
Avro length: 1081
MsgPack length: 1113
ProtoBuf length: 1170
Thrift length: 1364
Notepack length: 1371
Suite: Serialize packet with 1kbytes
√ JSON               148,192 rps
√ Avro               120,391 rps
√ MsgPack             17,091 rps
√ ProtoBuf           139,487 rps
√ Thrift              56,970 rps
√ Notepack            96,203 rps

   JSON (#)            0%        (148,192 rps)   (avg: 6μs)
   Avro           -18.76%        (120,391 rps)   (avg: 8μs)
   MsgPack        -88.47%         (17,091 rps)   (avg: 58μs)
   ProtoBuf        -5.87%        (139,487 rps)   (avg: 7μs)
   Thrift         -61.56%         (56,970 rps)   (avg: 17μs)
   Notepack       -35.08%         (96,203 rps)   (avg: 10μs)
-----------------------------------------------------------------------

JSON length: 50601
Avro length: 50552
MsgPack length: 50583
ProtoBuf length: 54187
Thrift length: 61472
Notepack length: 61479
Suite: Serialize packet with 50kbytes
√ JSON                 4,056 rps
√ Avro                 3,984 rps
√ MsgPack                474 rps
√ ProtoBuf             4,301 rps
√ Thrift               3,370 rps
√ Notepack             2,455 rps

   JSON (#)            0%          (4,056 rps)   (avg: 246μs)
   Avro            -1.79%          (3,984 rps)   (avg: 251μs)
   MsgPack        -88.32%            (474 rps)   (avg: 2ms)
   ProtoBuf        +6.05%          (4,301 rps)   (avg: 232μs)
   Thrift         -16.91%          (3,370 rps)   (avg: 296μs)
   Notepack       -39.48%          (2,455 rps)   (avg: 407μs)
-----------------------------------------------------------------------

JSON length: 101100
Avro length: 101051
MsgPack length: 101084
ProtoBuf length: 108312
Thrift length: 122849
Notepack length: 122858
Suite: Serialize packet with 100kbytes
√ JSON                 2,045 rps
√ Avro                 2,024 rps
√ MsgPack                235 rps
√ ProtoBuf             2,181 rps
√ Thrift               1,733 rps
√ Notepack             1,240 rps

   JSON (#)            0%          (2,045 rps)   (avg: 489μs)
   Avro            -1.02%          (2,024 rps)   (avg: 494μs)
   MsgPack        -88.51%            (235 rps)   (avg: 4ms)
   ProtoBuf        +6.65%          (2,181 rps)   (avg: 458μs)
   Thrift         -15.26%          (1,733 rps)   (avg: 577μs)
   Notepack       -39.38%          (1,240 rps)   (avg: 806μs)
-----------------------------------------------------------------------

JSON length: 36774
Avro length: 36725
MsgPack length: 36756
ProtoBuf length: 36736
Thrift length: 36773
Notepack length: 36780
Suite: Serialize packet with buf-10240bytes
√ JSON                 2,059 rps
√ Avro                 2,026 rps
√ MsgPack             35,863 rps
√ ProtoBuf             2,109 rps
√ Thrift               1,905 rps
√ Notepack           106,605 rps

   JSON (#)            0%          (2,059 rps)   (avg: 485μs)
   Avro            -1.57%          (2,026 rps)   (avg: 493μs)
   MsgPack       +1,641.94%         (35,863 rps)   (avg: 27μs)
   ProtoBuf        +2.44%          (2,109 rps)   (avg: 474μs)
   Thrift          -7.46%          (1,905 rps)   (avg: 524μs)
   Notepack      +5,077.95%        (106,605 rps)   (avg: 9μs)
-----------------------------------------------------------------------

JSON length: 365859
Avro length: 365810
MsgPack length: 365843
ProtoBuf length: 365821
Thrift length: 365858
Notepack length: 365867
Suite: Serialize packet with buf-102400bytes
√ JSON                   181 rps
√ Avro                   185 rps
√ MsgPack              7,451 rps
√ ProtoBuf               187 rps
√ Thrift                 172 rps
√ Notepack            13,976 rps

   JSON (#)            0%            (181 rps)   (avg: 5ms)
   Avro            +2.22%            (185 rps)   (avg: 5ms)
   MsgPack       +4,022.8%          (7,451 rps)   (avg: 134μs)
   ProtoBuf        +3.42%            (187 rps)   (avg: 5ms)
   Thrift          -4.59%            (172 rps)   (avg: 5ms)
   Notepack      +7,633.56%         (13,976 rps)   (avg: 71μs)
-----------------------------------------------------------------------


*/
