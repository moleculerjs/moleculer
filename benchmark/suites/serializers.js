"use strict";

const ServiceBroker = require("../../src/service-broker");
const FakeTransporter = require("../../src/transporters/fake");
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
		return new P.PacketEvent(brokerJSON.transit, "user.created", payload);
	});

	bench1.add("Avro", () => {
		return new P.PacketEvent(brokerAvro.transit, "user.created", payload);
	});
	
	bench1.add("MsgPack", () => {
		return new P.PacketEvent(brokerMsgPack.transit, "user.created", payload);
	});

	let bench2 = benchmark.createSuite(`Serialize request packet with ${dataName}bytes`);

	bench2.ref("JSON", () => {
		return new P.PacketRequest(brokerJSON.transit, "node-2-12345", "dcfef88f-7dbe-4eed-87f1-aba340279f4f", "post.update", payload);
	});

	bench2.add("Avro", () => {
		return new P.PacketRequest(brokerAvro.transit, "node-2-12345", "dcfef88f-7dbe-4eed-87f1-aba340279f4f", "post.update", payload);
	});
	
	bench2.add("MsgPack", () => {
		return new P.PacketRequest(brokerMsgPack.transit, "node-2-12345", "dcfef88f-7dbe-4eed-87f1-aba340279f4f", "post.update", payload);
	});

	bench1.run()
		.then(() => bench2.run())
		.then(() => {
			if (dataFiles.length > 0)
				runTest(dataFiles.shift());
		});
	
}

runTest(dataFiles.shift());

/*

*/