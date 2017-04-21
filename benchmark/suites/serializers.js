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
		nodeID: "node-1",
		transporter: new FakeTransporter(),
		serializer: new Serializer(opts)
	});

	return broker;
}

function runTest(dataName) {

	let data = getDataFile(dataName + ".json");
	let payload = JSON.parse(data);

	let brokerJSON = createBrokers(Serializers.JSON);
	let brokerAvro = createBrokers(Serializers.Avro);
	let brokerMsgPack = createBrokers(Serializers.MsgPack);
	let brokerProtoBuf = createBrokers(Serializers.ProtoBuf);

	let bench1 = benchmark.createSuite(`Serialize event packet with ${dataName}bytes`);

	bench1.ref("JSON", () => {
		const packet = new P.PacketEvent(brokerJSON.transit, "user.created", payload);
		return packet.serialize();
	});

	bench1.add("Avro", () => {
		const packet = new P.PacketEvent(brokerAvro.transit, "user.created", payload);
		return packet.serialize();
	});
	
	bench1.add("MsgPack", () => {
		const packet = new P.PacketEvent(brokerMsgPack.transit, "user.created", payload);
		return packet.serialize();
	});
	
	bench1.add("ProtoBuf", () => {
		const packet = new P.PacketEvent(brokerProtoBuf.transit, "user.created", payload);
		return packet.serialize();
	});

	let bench2 = benchmark.createSuite(`Serialize request packet with ${dataName}bytes`);

	const ctx = new Context();
	ctx.id = "dcfef88f-7dbe-4eed-87f1-aba340279f4f";
	ctx.action = {
		name: "posts.update"
	};
	ctx.nodeID = "node-2-12345";
	ctx.params = payload;

	console.log("JSON length:", (new P.PacketRequest(brokerJSON.transit, "node-2-12345", ctx)).serialize().length);
	console.log("Avro length:", (new P.PacketRequest(brokerAvro.transit, "node-2-12345", ctx)).serialize().length);
	console.log("MsgPack length:", (new P.PacketRequest(brokerMsgPack.transit, "node-2-12345", ctx)).serialize().length);
	console.log("ProtoBuf length:", (new P.PacketRequest(brokerProtoBuf.transit, "node-2-12345", ctx)).serialize().length);

	bench2.ref("JSON", () => {
		const packet = new P.PacketRequest(brokerJSON.transit, "node-2-12345", ctx);
		return packet.serialize();
	});

	bench2.add("Avro", () => {
		const packet = new P.PacketRequest(brokerAvro.transit, "node-2-12345", ctx);
		return packet.serialize();
	});
	
	bench2.add("MsgPack", () => {
		const packet = new P.PacketRequest(brokerMsgPack.transit, "node-2-12345", ctx);
		return packet.serialize();
	});
	
	bench2.add("ProtoBuf", () => {
		const packet = new P.PacketRequest(brokerProtoBuf.transit, "node-2-12345", ctx);
		return packet.serialize();
	});

	return bench1.run()
		.then(() => bench2.run())
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
   Node.JS: 6.10.0
   V8: 5.1.281.93
   Intel(R) Core(TM) i7-4770K CPU @ 3.50GHz × 8

JSON length: 177
Avro length: 75
MsgPack length: 137
ProtoBuf length: 82
Suite: Serialize event packet with 10bytes
√ JSON             1,127,978 rps
√ Avro               921,266 rps
√ MsgPack             98,007 rps
√ ProtoBuf           826,795 rps

   JSON (#)            0%      (1,127,978 rps)   (avg: 886ns)
   Avro           -18.33%        (921,266 rps)   (avg: 1μs)
   MsgPack        -91.31%         (98,007 rps)   (avg: 10μs)
   ProtoBuf        -26.7%        (826,795 rps)   (avg: 1μs)
-----------------------------------------------------------------------

Suite: Serialize request packet with 10bytes
√ JSON               621,247 rps
√ Avro               585,392 rps
√ MsgPack             53,962 rps
√ ProtoBuf           476,540 rps

   JSON (#)            0%        (621,247 rps)   (avg: 1μs)
   Avro            -5.77%        (585,392 rps)   (avg: 1μs)
   MsgPack        -91.31%         (53,962 rps)   (avg: 18μs)
   ProtoBuf       -23.29%        (476,540 rps)   (avg: 2μs)
-----------------------------------------------------------------------

JSON length: 331
Avro length: 216
MsgPack length: 278
ProtoBuf length: 223
Suite: Serialize event packet with 150bytes
√ JSON               461,563 rps
√ Avro               351,653 rps
√ MsgPack             80,712 rps
√ ProtoBuf           377,706 rps

   JSON (#)            0%        (461,563 rps)   (avg: 2μs)
   Avro           -23.81%        (351,653 rps)   (avg: 2μs)
   MsgPack        -82.51%         (80,712 rps)   (avg: 12μs)
   ProtoBuf       -18.17%        (377,706 rps)   (avg: 2μs)
-----------------------------------------------------------------------

Suite: Serialize request packet with 150bytes
√ JSON               346,086 rps
√ Avro               292,872 rps
√ MsgPack             44,776 rps
√ ProtoBuf           277,967 rps

   JSON (#)            0%        (346,086 rps)   (avg: 2μs)
   Avro           -15.38%        (292,872 rps)   (avg: 3μs)
   MsgPack        -87.06%         (44,776 rps)   (avg: 22μs)
   ProtoBuf       -19.68%        (277,967 rps)   (avg: 3μs)
-----------------------------------------------------------------------

JSON length: 1301
Avro length: 1118
MsgPack length: 1181
ProtoBuf length: 1125
Suite: Serialize event packet with 1kbytes
√ JSON               122,647 rps
√ Avro               104,191 rps
√ MsgPack             57,945 rps
√ ProtoBuf           141,024 rps

   JSON (#)            0%        (122,647 rps)   (avg: 8μs)
   Avro           -15.05%        (104,191 rps)   (avg: 9μs)
   MsgPack        -52.75%         (57,945 rps)   (avg: 17μs)
   ProtoBuf       +14.98%        (141,024 rps)   (avg: 7μs)
-----------------------------------------------------------------------

Suite: Serialize request packet with 1kbytes
√ JSON               112,659 rps
√ Avro                99,252 rps
√ MsgPack             38,276 rps
√ ProtoBuf           121,798 rps

   JSON (#)            0%        (112,659 rps)   (avg: 8μs)
   Avro            -11.9%         (99,252 rps)   (avg: 10μs)
   MsgPack        -66.02%         (38,276 rps)   (avg: 26μs)
   ProtoBuf        +8.11%        (121,798 rps)   (avg: 8μs)
-----------------------------------------------------------------------

JSON length: 11344
Avro length: 10516
MsgPack length: 10578
ProtoBuf length: 10522
Suite: Serialize event packet with 10kbytes
√ JSON                14,996 rps
√ Avro                13,267 rps
√ MsgPack             14,009 rps
√ ProtoBuf            21,902 rps

   JSON (#)            0%         (14,996 rps)   (avg: 66μs)
   Avro           -11.53%         (13,267 rps)   (avg: 75μs)
   MsgPack         -6.58%         (14,009 rps)   (avg: 71μs)
   ProtoBuf       +46.05%         (21,902 rps)   (avg: 45μs)
-----------------------------------------------------------------------

Suite: Serialize request packet with 10kbytes
√ JSON                15,310 rps
√ Avro                12,822 rps
√ MsgPack             12,595 rps
√ ProtoBuf            20,763 rps

   JSON (#)            0%         (15,310 rps)   (avg: 65μs)
   Avro           -16.25%         (12,822 rps)   (avg: 77μs)
   MsgPack        -17.73%         (12,595 rps)   (avg: 79μs)
   ProtoBuf       +35.61%         (20,763 rps)   (avg: 48μs)
-----------------------------------------------------------------------

JSON length: 54317
Avro length: 50589
MsgPack length: 50651
ProtoBuf length: 50596
Suite: Serialize event packet with 50kbytes
√ JSON                 3,319 rps
√ Avro                 2,893 rps
√ MsgPack              3,657 rps
√ ProtoBuf             4,549 rps

   JSON (#)            0%          (3,319 rps)   (avg: 301μs)
   Avro           -12.83%          (2,893 rps)   (avg: 345μs)
   MsgPack        +10.19%          (3,657 rps)   (avg: 273μs)
   ProtoBuf       +37.06%          (4,549 rps)   (avg: 219μs)
-----------------------------------------------------------------------

Suite: Serialize request packet with 50kbytes
√ JSON                 3,307 rps
√ Avro                 2,872 rps
√ MsgPack              3,478 rps
√ ProtoBuf             4,527 rps

   JSON (#)            0%          (3,307 rps)   (avg: 302μs)
   Avro           -13.14%          (2,872 rps)   (avg: 348μs)
   MsgPack         +5.19%          (3,478 rps)   (avg: 287μs)
   ProtoBuf       +36.89%          (4,527 rps)   (avg: 220μs)
-----------------------------------------------------------------------

JSON length: 108442
Avro length: 101088
MsgPack length: 101152
ProtoBuf length: 101095
Suite: Serialize event packet with 100kbytes
√ JSON                 1,679 rps
√ Avro                 1,462 rps
√ MsgPack              1,936 rps
√ ProtoBuf             2,325 rps

   JSON (#)            0%          (1,679 rps)   (avg: 595μs)
   Avro           -12.97%          (1,462 rps)   (avg: 684μs)
   MsgPack        +15.26%          (1,936 rps)   (avg: 516μs)
   ProtoBuf       +38.42%          (2,325 rps)   (avg: 430μs)
-----------------------------------------------------------------------

Suite: Serialize request packet with 100kbytes
√ JSON                 1,683 rps
√ Avro                 1,464 rps
√ MsgPack              1,890 rps
√ ProtoBuf             2,357 rps

   JSON (#)            0%          (1,683 rps)   (avg: 594μs)
   Avro              -13%          (1,464 rps)   (avg: 682μs)
   MsgPack        +12.32%          (1,890 rps)   (avg: 529μs)
   ProtoBuf       +40.08%          (2,357 rps)   (avg: 424μs)
-----------------------------------------------------------------------

JSON length: 1082692
Avro length: 1010070
MsgPack length: 1010134
ProtoBuf length: 1010077
Suite: Serialize event packet with 1Mbytes
√ JSON                   158 rps
√ Avro                   131 rps
√ MsgPack                191 rps
√ ProtoBuf               193 rps

   JSON (#)            0%            (158 rps)   (avg: 6ms)
   Avro           -17.29%            (131 rps)   (avg: 7ms)
   MsgPack        +21.13%            (191 rps)   (avg: 5ms)
   ProtoBuf       +22.28%            (193 rps)   (avg: 5ms)
-----------------------------------------------------------------------

Suite: Serialize request packet with 1Mbytes
√ JSON                   157 rps
√ Avro                   131 rps
√ MsgPack                190 rps
√ ProtoBuf               192 rps

   JSON (#)            0%            (157 rps)   (avg: 6ms)
   Avro           -16.91%            (131 rps)   (avg: 7ms)
   MsgPack        +21.22%            (190 rps)   (avg: 5ms)
   ProtoBuf       +22.22%            (192 rps)   (avg: 5ms)
-----------------------------------------------------------------------

*/