const { MoleculerError } = require("../../../src/errors");
const Transporters = require("../../../src/transporters");

describe("Test Transporter resolver", () => {

	it("should resolve null from undefined", () => {
		let trans = Transporters.resolve();
		expect(trans).toBeNull();
	});

	describe("Resolve NATS transporter", () => {

		it("should resolve NATSTransporter from connection string", () => {
			let trans = Transporters.resolve("nats://localhost:4222");
			expect(trans).toBeInstanceOf(Transporters.NATS);
		});

		it("should resolve NATSTransporter from string", () => {
			let trans = Transporters.resolve("NATS");
			expect(trans).toBeInstanceOf(Transporters.NATS);
		});

		it("should resolve NATSTransporter from obj without type", () => {
			let options = { url: "nats://localhost:4222" };
			let trans = Transporters.resolve({ options });
			expect(trans).toBeInstanceOf(Transporters.NATS);
			expect(trans.opts).toEqual({"maxReconnectAttempts": -1, "preserveBuffers": true, "url": "nats://localhost:4222"});
		});
	});

	describe("Resolve MQTT transporter", () => {

		it("should resolve MQTTTransporter from connection string", () => {
			let trans = Transporters.resolve("mqtt://localhost");
			expect(trans).toBeInstanceOf(Transporters.MQTT);
		});

		it("should resolve MQTTTransporter from string", () => {
			let trans = Transporters.resolve("mqtt");
			expect(trans).toBeInstanceOf(Transporters.MQTT);
		});

		it("should resolve MQTTransporter from obj", () => {
			let options = { mqtt: "mqtt://localhost" };
			let trans = Transporters.resolve({ type: "mqtt", options });
			expect(trans).toBeInstanceOf(Transporters.MQTT);
			expect(trans.opts).toEqual({ mqtt: "mqtt://localhost" });
		});
	});

	describe("Resolve Redis transporter", () => {

		it("should resolve RedisTransporter from connection string", () => {
			let trans = Transporters.resolve("redis://localhost");
			expect(trans).toBeInstanceOf(Transporters.Redis);
		});

		it("should resolve RedisTransporter from string", () => {
			let trans = Transporters.resolve("Redis");
			expect(trans).toBeInstanceOf(Transporters.Redis);
		});

		it("should resolve RedisTransporter from obj with Redis type", () => {
			let options = { redis: { db: 3 } };
			let trans = Transporters.resolve({ type: "Redis", options });
			expect(trans).toBeInstanceOf(Transporters.Redis);
			expect(trans.opts).toEqual({ redis: { db: 3 } });
		});
	});

	describe("Resolve AMQP transporter", () => {

		it("should resolve AMQPTransporter from connection string", () => {
			let trans = Transporters.resolve("amqp");
			expect(trans).toBeInstanceOf(Transporters.AMQP);
		});

		it("should resolve AMQPTransporter from connection string", () => {
			let trans = Transporters.resolve("amqp://localhost:5672");
			expect(trans).toBeInstanceOf(Transporters.AMQP);
		});

		it("should resolve AMQPTransporter from obj", () => {
			let options = { url: "amqp://localhost" };
			let trans = Transporters.resolve({ type: "AMQP", options });
			expect(trans).toBeInstanceOf(Transporters.AMQP);
			expect(trans.opts).toEqual({
				prefetch: 1,
				heartbeatTimeToLive: null,
				eventTimeToLive: null,
				url: "amqp://localhost",
				exchangeOptions: {},
				messageOptions: {},
				queueOptions: {},
				consumeOptions: {}
			});
		});
	});

	describe("Resolve Kafka transporter", () => {

		it("should resolve KafkaTransporter from connection string", () => {
			let trans = Transporters.resolve("kafka");
			expect(trans).toBeInstanceOf(Transporters.Kafka);
		});

		it("should resolve KafkaTransporter from connection string", () => {
			let trans = Transporters.resolve("kafka://localhost:2181");
			expect(trans).toBeInstanceOf(Transporters.Kafka);
			expect(trans.opts).toEqual({
				"host": "localhost:2181",
				"client": {
					"noAckBatchOptions": undefined,
					"sslOptions": undefined,
					"zkOptions": undefined
				},
				"consumer": {},
				"customPartitioner": undefined,
				"producer": {},
				"publish": {
					"attributes": 0,
					"partition": 0
				}
			});
		});

		it("should resolve KafkaTransporter from obj", () => {
			let options = {
				host: "localhost:2181",
				publish: {
					partition: 2
				}
			};
			let trans = Transporters.resolve({ type: "Kafka", options });
			expect(trans).toBeInstanceOf(Transporters.Kafka);
			expect(trans.opts).toEqual({
				"host": "localhost:2181",
				"client": {
					"noAckBatchOptions": undefined,
					"sslOptions": undefined,
					"zkOptions": undefined
				},
				"consumer": {},
				"customPartitioner": undefined,
				"producer": {},
				"publish": {
					"attributes": 0,
					"partition": 2
				}
			});
		});
	});

	describe("Resolve NATS Streaming transporter", () => {

		it("should resolve NatsStreamingTransporter from connection string", () => {
			let trans = Transporters.resolve("stan://localhost:4222");
			expect(trans).toBeInstanceOf(Transporters.STAN);
		});

		it("should resolve NatsStreamingTransporter from string", () => {
			let trans = Transporters.resolve("STAN");
			expect(trans).toBeInstanceOf(Transporters.STAN);
		});

		it("should resolve NatsStreamingTransporter from obj without type", () => {
			let options = { url: "stan://localhost:4222" };
			let trans = Transporters.resolve({ type: "STAN", options });
			expect(trans).toBeInstanceOf(Transporters.STAN);
			expect(trans.opts).toEqual({
				"clusterID": "test-cluster",
				"preserveBuffers": true,
				"url": "stan://localhost:4222"
			});
		});
	});

	describe("Resolve TCP transporter", () => {

		it("should resolve TcpTransporter from connection string", () => {
			let trans = Transporters.resolve("tcp://192.168.0.100:6000");
			expect(trans).toBeInstanceOf(Transporters.TCP);
			expect(trans.opts.urls).toBe("tcp://192.168.0.100:6000");
		});

		it("should resolve TcpTransporter from string", () => {
			let trans = Transporters.resolve("TCP");
			expect(trans).toBeInstanceOf(Transporters.TCP);
		});

		it("should resolve TcpTransporter from obj without type", () => {
			let options = {
				port: 1234,
				udpPeriod: 5,
				udpBroadcast: true,
				udpBindAddress: "192.168.0.100"
			};
			let trans = Transporters.resolve({ type: "TCP", options });
			expect(trans).toBeInstanceOf(Transporters.TCP);
			expect(trans.opts).toEqual({
				"gossipPeriod": 2,
				"maxConnections": 32,
				"maxPacketSize": 1048576,
				"port": 1234,
				"udpBindAddress": "192.168.0.100",
				"udpBroadcast": true,
				"udpDiscovery": true,
				"udpMaxDiscovery": 0,
				"udpMulticast": "239.0.0.0",
				"udpMulticastTTL": 1,
				"udpPeriod": 5,
				"udpPort": 4445,
				"udpReuseAddr": true,
				"urls": null,
				"useHostname": true
			});
		});

		it("should throw error if type if not correct", () => {
			expect(() => {
				Transporters.resolve("xyz");
			}).toThrowError(MoleculerError);

			expect(() => {
				Transporters.resolve({ type: "xyz" });
			}).toThrowError(MoleculerError);
		});

	});

});
