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
	let thriftSer = new Serializers.Thrift();

	JsonSer.init(broker);
	AvroSer.init(broker);
	MsgPackSer.init(broker);
	protoBufSer.init(broker);
	thriftSer.init(broker);

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

	console.log("JSON length:", JsonSer.serialize(packet.payload, packet.type).length);
	console.log("Avro length:", AvroSer.serialize(packet.payload, packet.type).length);
	console.log("MsgPack length:", MsgPackSer.serialize(packet.payload, packet.type).length);
	console.log("ProtoBuf length:", protoBufSer.serialize(packet.payload, packet.type).length);
	console.log("Thrift length:", thriftSer.serialize(packet.payload, packet.type).length);

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
Suite: Serialize packet with 10bytes
√ JSON               811,290 rps
√ Avro               624,283 rps
√ MsgPack             76,703 rps
√ ProtoBuf           770,425 rps
√ Thrift             110,583 rps

   JSON (#)            0%        (811,290 rps)   (avg: 1μs)
   Avro           -23.05%        (624,283 rps)   (avg: 1μs)
   MsgPack        -90.55%         (76,703 rps)   (avg: 13μs)
   ProtoBuf        -5.04%        (770,425 rps)   (avg: 1μs)
   Thrift         -86.37%        (110,583 rps)   (avg: 9μs)
-----------------------------------------------------------------------

JSON length: 229
Avro length: 179
MsgPack length: 210
ProtoBuf length: 200
Thrift length: 258
Suite: Serialize packet with 150bytes
√ JSON               437,439 rps
√ Avro               348,092 rps
√ MsgPack             63,000 rps
√ ProtoBuf           408,807 rps
√ Thrift              93,022 rps

   JSON (#)            0%        (437,439 rps)   (avg: 2μs)
   Avro           -20.42%        (348,092 rps)   (avg: 2μs)
   MsgPack         -85.6%         (63,000 rps)   (avg: 15μs)
   ProtoBuf        -6.55%        (408,807 rps)   (avg: 2μs)
   Thrift         -78.73%         (93,022 rps)   (avg: 10μs)
-----------------------------------------------------------------------

JSON length: 1131
Avro length: 1081
MsgPack length: 1113
ProtoBuf length: 1170
Thrift length: 1364
Suite: Serialize packet with 1kbytes
√ JSON               148,417 rps
√ Avro               125,403 rps
√ MsgPack             17,387 rps
√ ProtoBuf           143,478 rps
√ Thrift              63,276 rps

   JSON (#)            0%        (148,417 rps)   (avg: 6μs)
   Avro           -15.51%        (125,403 rps)   (avg: 7μs)
   MsgPack        -88.29%         (17,387 rps)   (avg: 57μs)
   ProtoBuf        -3.33%        (143,478 rps)   (avg: 6μs)
   Thrift         -57.37%         (63,276 rps)   (avg: 15μs)
-----------------------------------------------------------------------

JSON length: 10528
Avro length: 10479
MsgPack length: 10510
ProtoBuf length: 11213
Thrift length: 12699
Suite: Serialize packet with 10kbytes
√ JSON                19,147 rps
√ Avro                18,598 rps
√ MsgPack              2,343 rps
√ ProtoBuf            20,118 rps
√ Thrift              14,284 rps

   JSON (#)            0%         (19,147 rps)   (avg: 52μs)
   Avro            -2.86%         (18,598 rps)   (avg: 53μs)
   MsgPack        -87.77%          (2,343 rps)   (avg: 426μs)
   ProtoBuf        +5.07%         (20,118 rps)   (avg: 49μs)
   Thrift         -25.39%         (14,284 rps)   (avg: 70μs)
-----------------------------------------------------------------------

JSON length: 50601
Avro length: 50552
MsgPack length: 50583
ProtoBuf length: 54187
Thrift length: 61472
Suite: Serialize packet with 50kbytes
√ JSON                 4,110 rps
√ Avro                 4,032 rps
√ MsgPack                481 rps
√ ProtoBuf             4,362 rps
√ Thrift               3,401 rps

   JSON (#)            0%          (4,110 rps)   (avg: 243μs)
   Avro             -1.9%          (4,032 rps)   (avg: 248μs)
   MsgPack         -88.3%            (481 rps)   (avg: 2ms)
   ProtoBuf        +6.13%          (4,362 rps)   (avg: 229μs)
   Thrift         -17.26%          (3,401 rps)   (avg: 294μs)
-----------------------------------------------------------------------

JSON length: 101100
Avro length: 101051
MsgPack length: 101084
ProtoBuf length: 108312
Thrift length: 122849
Suite: Serialize packet with 100kbytes
√ JSON                 2,075 rps
√ Avro                 2,045 rps
√ MsgPack                234 rps
√ ProtoBuf             2,202 rps
√ Thrift               1,752 rps

   JSON (#)            0%          (2,075 rps)   (avg: 481μs)
   Avro            -1.47%          (2,045 rps)   (avg: 488μs)
   MsgPack        -88.73%            (234 rps)   (avg: 4ms)
   ProtoBuf         +6.1%          (2,202 rps)   (avg: 454μs)
   Thrift         -15.57%          (1,752 rps)   (avg: 570μs)
-----------------------------------------------------------------------

JSON length: 1010082
Avro length: 1010033
MsgPack length: 1010066
ProtoBuf length: 1082562
Thrift length: 1227635
Suite: Serialize packet with 1Mbytes
√ JSON                   187 rps
√ Avro                   184 rps
√ MsgPack                 22 rps
√ ProtoBuf               195 rps
√ Thrift                 156 rps

   JSON (#)            0%            (187 rps)   (avg: 5ms)
   Avro            -1.81%            (184 rps)   (avg: 5ms)
   MsgPack        -88.04%             (22 rps)   (avg: 44ms)
   ProtoBuf        +4.44%            (195 rps)   (avg: 5ms)
   Thrift         -16.75%            (156 rps)   (avg: 6ms)
-----------------------------------------------------------------------


*/
