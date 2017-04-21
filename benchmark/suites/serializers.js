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

*/