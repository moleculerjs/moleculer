/* eslint-disable no-console */
"use strict";

const ServiceBroker = require("../../src/service-broker");
const FakeTransporter = require("../../src/transporters/fake");
const Context = require("../../src/context");
const Serializers = require("../../src/serializers");
const P = require("../../src/packets");

const { getDataFile } = require("../utils");

const Benchmarkify = require("benchmarkify");
const benchmark = new Benchmarkify("Serializers benchmark").printHeader();

let dataFiles = ["10", "150", "1k", "10k", "50k", "100k", "1M"];

function createBrokers(Serializer, opts) {
	const broker = new ServiceBroker({
		logger: false,
		nodeID: "node-1",
		transporter: new FakeTransporter(),
		serializer: new Serializer(opts)
	});

	return broker;
}

function runTest(dataName) {

	let data = getDataFile(dataName + ".json");
	let payload = JSON.parse(data);

	const broker = new ServiceBroker({ logger: false });

	let JsonSer = new Serializers.JSON();
	let AvroSer = new Serializers.Avro();
	let MsgPackSer = new Serializers.MsgPack();
	let protoBufSer = new Serializers.ProtoBuf();

	JsonSer.init(broker);
	AvroSer.init(broker);
	MsgPackSer.init(broker);
	protoBufSer.init(broker);

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

	console.log("JSON length:", JsonSer.serialize(packet.payload, packet.type).length);
	console.log("Avro length:", AvroSer.serialize(packet.payload, packet.type).length);
	console.log("MsgPack length:", MsgPackSer.serialize(packet.payload, packet.type).length);
	console.log("ProtoBuf length:", protoBufSer.serialize(packet.payload, packet.type).length);

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
   Node.JS: 8.9.4
   V8: 6.1.534.50
   Intel(R) Core(TM) i7-4770K CPU @ 3.50GHz × 8

JSON length: 89
Avro length: 38
MsgPack length: 69
ProtoBuf length: 45
Suite: Serialize packet with 10bytes
√ JSON             1,276,006 rps
√ Avro               608,887 rps
√ MsgPack             61,587 rps
√ ProtoBuf           927,611 rps

   JSON (#)            0%      (1,276,006 rps)   (avg: 783ns)
   Avro           -52.28%        (608,887 rps)   (avg: 1μs)
   MsgPack        -95.17%         (61,587 rps)   (avg: 16μs)
   ProtoBuf        -27.3%        (927,611 rps)   (avg: 1μs)
-----------------------------------------------------------------------

JSON length: 1131
Avro length: 1081
MsgPack length: 1113
ProtoBuf length: 1170
Suite: Serialize packet with 1kbytes
√ JSON               205,813 rps
√ Avro               123,731 rps
√ MsgPack             12,661 rps
√ ProtoBuf           147,930 rps

   JSON (#)            0%        (205,813 rps)   (avg: 4μs)
   Avro           -39.88%        (123,731 rps)   (avg: 8μs)
   MsgPack        -93.85%         (12,661 rps)   (avg: 78μs)
   ProtoBuf       -28.12%        (147,930 rps)   (avg: 6μs)
-----------------------------------------------------------------------

JSON length: 10528
Avro length: 10479
MsgPack length: 10510
ProtoBuf length: 11213
Suite: Serialize packet with 10kbytes
√ JSON                26,892 rps
√ Avro                18,671 rps
√ MsgPack              1,642 rps
√ ProtoBuf            20,388 rps

   JSON (#)            0%         (26,892 rps)   (avg: 37μs)
   Avro           -30.57%         (18,671 rps)   (avg: 53μs)
   MsgPack        -93.89%          (1,642 rps)   (avg: 608μs)
   ProtoBuf       -24.18%         (20,388 rps)   (avg: 49μs)
-----------------------------------------------------------------------

JSON length: 50601
Avro length: 50552
MsgPack length: 50583
ProtoBuf length: 54187
Suite: Serialize packet with 50kbytes
√ JSON                 5,851 rps
√ Avro                 4,065 rps
√ MsgPack                338 rps
√ ProtoBuf             4,455 rps

   JSON (#)            0%          (5,851 rps)   (avg: 170μs)
   Avro           -30.53%          (4,065 rps)   (avg: 246μs)
   MsgPack        -94.22%            (338 rps)   (avg: 2ms)
   ProtoBuf       -23.86%          (4,455 rps)   (avg: 224μs)
-----------------------------------------------------------------------

JSON length: 101100
Avro length: 101051
MsgPack length: 101084
ProtoBuf length: 108312
Suite: Serialize packet with 100kbytes
√ JSON                 2,980 rps
√ Avro                 2,075 rps
√ MsgPack                169 rps
√ ProtoBuf             2,254 rps

   JSON (#)            0%          (2,980 rps)   (avg: 335μs)
   Avro           -30.36%          (2,075 rps)   (avg: 481μs)
   MsgPack        -94.34%            (169 rps)   (avg: 5ms)
   ProtoBuf       -24.39%          (2,254 rps)   (avg: 443μs)
-----------------------------------------------------------------------

JSON length: 1010082
Avro length: 1010033
MsgPack length: 1010066
ProtoBuf length: 1082562
Suite: Serialize packet with 1Mbytes
√ JSON                   300 rps
√ Avro                   188 rps
√ MsgPack                 16 rps
√ ProtoBuf               199 rps

   JSON (#)            0%            (300 rps)   (avg: 3ms)
   Avro           -37.21%            (188 rps)   (avg: 5ms)
   MsgPack        -94.51%             (16 rps)   (avg: 60ms)
   ProtoBuf       -33.69%            (199 rps)   (avg: 5ms)
-----------------------------------------------------------------------

*/
