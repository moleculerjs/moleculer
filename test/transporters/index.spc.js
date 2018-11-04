"use strict";

const CallingSuite = require("./suites/call");
const StreamingSuite = require("./suites/streaming");

const TRANSPORTERS = [
	{ name: "NATS", transporter: process.env.TEST_NATS_URI || "nats://127.0.0.1:4222" },
	// { name: "Redis", transporter: process.env.TEST_REDIS_URI || "redis://127.0.0.1:6379" },
	// { name: "MQTT", transporter: process.env.TEST_MQTT_URI || "mqtt://127.0.0.1:1883" },
	// { name: "AMQP", transporter: process.env.TEST_AMQP_URI || "amqp://guest:guest@127.0.0.1:5672" },
	// { name: "Kafka", transporter: process.env.TEST_KAFKA_URI || "kafka://127.0.0.1:2181" },
	// { name: "STAN", transporter: process.env.TEST_STAN_URI || "stan://127.0.0.1:4222" },
	// { name: "TCP", transporter: "TCP" },
];

const SERIALIZERS = [
	{ name: "JSON", serializer: "JSON" },
	{ name: "ProtoBuf", serializer: "ProtoBuf" },
	{ name: "Avro", serializer: "Avro" },
	{ name: "MsgPack", serializer: "MsgPack" },
	{ name: "Thrift", serializer: "Thrift" },
	{ name: "Notepack", serializer: "Notepack" },
];

SERIALIZERS.forEach(ss => {
	TRANSPORTERS.forEach(tt => {
		const meta = { transporter: tt.name, serializer: ss.name };
		describe(`Test '${tt.name}' + '${ss.name}'`, () => {
			CallingSuite(tt.transporter, ss.serializer, meta);
			StreamingSuite(tt.transporter, ss.serializer, meta);
		});
	});
});
