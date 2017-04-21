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
Suite: Serialize event packet with 10bytes
√ JSON            1,124,939 rps
√ Avro              925,157 rps
√ MsgPack            99,040 rps

   JSON (#)           0%      (1,124,939 rps)   (avg: 888ns)
   Avro          -17.76%        (925,157 rps)   (avg: 1μs)
   MsgPack        -91.2%         (99,040 rps)   (avg: 10μs)
-----------------------------------------------------------------------

Suite: Serialize request packet with 10bytes
√ JSON              615,732 rps
√ Avro              579,453 rps
√ MsgPack            55,954 rps

   JSON (#)           0%        (615,732 rps)   (avg: 1μs)
   Avro           -5.89%        (579,453 rps)   (avg: 1μs)
   MsgPack       -90.91%         (55,954 rps)   (avg: 17μs)
-----------------------------------------------------------------------

JSON length: 331
Avro length: 216
MsgPack length: 278
Suite: Serialize event packet with 150bytes
√ JSON              460,613 rps
√ Avro              358,995 rps
√ MsgPack            86,702 rps

   JSON (#)           0%        (460,613 rps)   (avg: 2μs)
   Avro          -22.06%        (358,995 rps)   (avg: 2μs)
   MsgPack       -81.18%         (86,702 rps)   (avg: 11μs)
-----------------------------------------------------------------------

Suite: Serialize request packet with 150bytes
√ JSON              341,672 rps
√ Avro              292,635 rps
√ MsgPack            49,990 rps

   JSON (#)           0%        (341,672 rps)   (avg: 2μs)
   Avro          -14.35%        (292,635 rps)   (avg: 3μs)
   MsgPack       -85.37%         (49,990 rps)   (avg: 20μs)
-----------------------------------------------------------------------

JSON length: 1301
Avro length: 1118
MsgPack length: 1181
Suite: Serialize event packet with 1kbytes
√ JSON              123,840 rps
√ Avro              105,663 rps
√ MsgPack            59,347 rps

   JSON (#)           0%        (123,840 rps)   (avg: 8μs)
   Avro          -14.68%        (105,663 rps)   (avg: 9μs)
   MsgPack       -52.08%         (59,347 rps)   (avg: 16μs)
-----------------------------------------------------------------------

Suite: Serialize request packet with 1kbytes
√ JSON              114,891 rps
√ Avro               99,964 rps
√ MsgPack            38,987 rps

   JSON (#)           0%        (114,891 rps)   (avg: 8μs)
   Avro          -12.99%         (99,964 rps)   (avg: 10μs)
   MsgPack       -66.07%         (38,987 rps)   (avg: 25μs)
-----------------------------------------------------------------------

JSON length: 11344
Avro length: 10516
MsgPack length: 10578
Suite: Serialize event packet with 10kbytes
√ JSON               15,396 rps
√ Avro               13,895 rps
√ MsgPack            16,661 rps

   JSON (#)           0%         (15,396 rps)   (avg: 64μs)
   Avro           -9.75%         (13,895 rps)   (avg: 71μs)
   MsgPack        +8.22%         (16,661 rps)   (avg: 60μs)
-----------------------------------------------------------------------

Suite: Serialize request packet with 10kbytes
√ JSON               15,284 rps
√ Avro               13,933 rps
√ MsgPack            14,620 rps

   JSON (#)           0%         (15,284 rps)   (avg: 65μs)
   Avro           -8.84%         (13,933 rps)   (avg: 71μs)
   MsgPack        -4.34%         (14,620 rps)   (avg: 68μs)
-----------------------------------------------------------------------

JSON length: 54317
Avro length: 50589
MsgPack length: 50651
Suite: Serialize event packet with 50kbytes
√ JSON                3,332 rps
√ Avro                3,014 rps
√ MsgPack             3,680 rps

   JSON (#)           0%          (3,332 rps)   (avg: 300μs)
   Avro           -9.53%          (3,014 rps)   (avg: 331μs)
   MsgPack       +10.44%          (3,680 rps)   (avg: 271μs)
-----------------------------------------------------------------------

Suite: Serialize request packet with 50kbytes
√ JSON                3,309 rps
√ Avro                2,886 rps
√ MsgPack             3,507 rps

   JSON (#)           0%          (3,309 rps)   (avg: 302μs)
   Avro          -12.79%          (2,886 rps)   (avg: 346μs)
   MsgPack        +5.97%          (3,507 rps)   (avg: 285μs)
-----------------------------------------------------------------------

JSON length: 108442
Avro length: 101088
MsgPack length: 101152
Suite: Serialize event packet with 100kbytes
√ JSON                1,685 rps
√ Avro                1,470 rps
√ MsgPack             1,924 rps

   JSON (#)           0%          (1,685 rps)   (avg: 593μs)
   Avro          -12.73%          (1,470 rps)   (avg: 680μs)
   MsgPack       +14.18%          (1,924 rps)   (avg: 519μs)
-----------------------------------------------------------------------

Suite: Serialize request packet with 100kbytes
√ JSON                1,684 rps
√ Avro                1,470 rps
√ MsgPack             1,902 rps

   JSON (#)           0%          (1,684 rps)   (avg: 593μs)
   Avro          -12.66%          (1,470 rps)   (avg: 680μs)
   MsgPack       +12.99%          (1,902 rps)   (avg: 525μs)
-----------------------------------------------------------------------

JSON length: 1082692
Avro length: 1010070
MsgPack length: 1010134
Suite: Serialize event packet with 1Mbytes
√ JSON                  158 rps
√ Avro                  131 rps
√ MsgPack               193 rps

   JSON (#)           0%            (158 rps)   (avg: 6ms)
   Avro           -17.1%            (131 rps)   (avg: 7ms)
   MsgPack       +22.11%            (193 rps)   (avg: 5ms)
-----------------------------------------------------------------------

Suite: Serialize request packet with 1Mbytes
√ JSON                  158 rps
√ Avro                  131 rps
√ MsgPack               192 rps

   JSON (#)           0%            (158 rps)   (avg: 6ms)
   Avro          -16.81%            (131 rps)   (avg: 7ms)
   MsgPack       +22.21%            (192 rps)   (avg: 5ms)
-----------------------------------------------------------------------

*/