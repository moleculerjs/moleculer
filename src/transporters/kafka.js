/*
 * moleculer
 * Copyright (c) 2023 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const { defaultsDeep } = require("lodash");
const Transporter = require("./base");
const C = require("../constants");

const toMoleculerLogLevel = level => {
	switch (level) {
		case 0:
		case 1:
			return "error";
		case 2:
			return "warn";
		case 4:
			return "info";
		case 5:
			return "debug";
	}
};

/**
 * Lightweight transporter for Kafka
 *
 * For test:
 *   1. clone https://github.com/wurstmeister/kafka-docker.git repo
 *   2. follow instructions on https://github.com/wurstmeister/kafka-docker#pre-requisites
 * 	 3. start containers with Docker Compose
 *
 * 			docker-compose -f docker-compose-single-broker.yml up -d
 *
 * @class KafkaTransporter
 * @extends {Transporter}
 */
class KafkaTransporter extends Transporter {
	/**
	 * Creates an instance of KafkaTransporter.
	 *
	 * @param {any} opts
	 *
	 * @memberof KafkaTransporter
	 */
	constructor(opts) {
		if (typeof opts === "string") {
			opts = { brokers: opts.replace("kafka://", "") };
		} else if (opts == null) {
			opts = {};
		}

		opts = defaultsDeep(opts, {
			// KafkaClient options. More info: https://kafka.js.org/docs/configuration
			client: {
				brokers: Array.isArray(opts.brokers) ? opts.brokers : [opts.brokers],
				logLevel: 1,
				logCreator:
					logLevel =>
					({ level, log }) => {
						const { message, ...extra } = log;
						if (log.error == "Topic creation errors") return;
						this.logger[toMoleculerLogLevel(level)](message, extra);
					}
			},

			// KafkaProducer options. More info: https://kafka.js.org/docs/producing#options
			producer: {},

			// ConsumerGroup options. More info: https://kafka.js.org/docs/consuming#a-name-options-a-options
			consumer: {},

			// Advanced options for `send`. More info: https://kafka.js.org/docs/producing#producing-messages
			publish: {},

			// Advanced message options for `send`. More info: https://kafka.js.org/docs/producing#message-structure
			publishMessage: {
				partition: 0
			}
		});

		super(opts);

		this.client = null;
		this.producer = null;
		this.consumer = null;
		this.admin = null;
	}

	/**
	 * Connect to the server
	 *
	 * @memberof KafkaTransporter
	 */
	async connect() {
		let Kafka;
		try {
			Kafka = require("kafkajs").Kafka;
		} catch (err) {
			/* istanbul ignore next */
			this.broker.fatal(
				"The 'kafkajs' package is missing. Please install it with 'npm install kafkajs --save' command.",
				err,
				true
			);
		}

		this.client = new Kafka(this.opts.client);

		// Create Producer
		this.producer = this.client.producer(this.opts.producer);
		this.admin = this.client.admin();
		try {
			await this.admin.connect();
			await this.producer.connect();
			this.logger.info("Kafka client is connected.");
			await this.onConnected();
		} catch (err) {
			this.logger.error("Kafka Producer error", err.message);
			this.logger.debug(err);

			this.broker.broadcastLocal("$transporter.error", {
				error: err,
				module: "transporter",
				type: C.FAILED_PUBLISHER_ERROR
			});

			throw err;
		}
	}

	/**
	 * Disconnect from the server
	 *
	 * @memberof KafkaTransporter
	 */
	async disconnect() {
		if (this.admin) {
			await this.admin.disconnect;
			this.admin = null;
		}
		if (this.producer) {
			await this.producer.disconnect;
			this.producer = null;
		}
		if (this.consumer) {
			await this.consumer.disconnect;
			this.consumer = null;
		}
	}

	/**
	 * Subscribe to all topics
	 *
	 * @param {Array<Object>} topics
	 *
	 * @memberof BaseTransporter
	 */
	async makeSubscriptions(topics) {
		// Create topics
		topics = topics.map(({ cmd, nodeID }) => ({ topic: this.getTopicName(cmd, nodeID) }));
		try {
			await this.admin.createTopics({ topics });
		} catch (err) {
			this.logger.error("Unable to create topics!", topics, err);

			this.broker.broadcastLocal("$transporter.error", {
				error: err,
				module: "transporter",
				type: C.FAILED_TOPIC_CREATION
			});
			throw err;
		}

		// Create Consumer
		try {
			const consumerOptions = Object.assign(
				{
					// id: "default-kafka-consumer",
					// kafkaHost: this.opts.host,
					groupId: this.broker.instanceID
					// fromOffset: "latest",
					// encoding: "buffer"
				},
				this.opts.consumer
			);

			this.consumer = this.client.consumer(consumerOptions);
			await this.consumer.connect();

			this.consumer.subscribe({ topics: topics.map(topic => topic.topic) });
			// Ref: https://kafka.js.org/docs/consuming#a-name-each-message-a-eachmessage
			this.consumer.run({
				eachMessage: async ({ topic, message }) => {
					const cmd = topic.split(".")[1];
					await this.receive(cmd, message.value);
					// console.log({
					// 	topic,
					// 	key: (message.key ? message.key.toString() : ""),
					// 	value: message.value.toString(),
					// 	headers: message.headers,
					// });
				}
			});
		} catch (err) {
			this.logger.error("Kafka Consumer error", err.message);
			this.logger.debug(err);

			this.broker.broadcastLocal("$transporter.error", {
				error: err,
				module: "transporter",
				type: C.FAILED_CONSUMER_ERROR
			});

			throw err;
		}
	}

	/**
	 * Send data buffer.
	 *
	 * @param {String} topic
	 * @param {Buffer} data
	 * @param {Object} meta
	 *
	 * @returns {Promise}
	 */
	async send(topic, data, { packet }) {
		/* istanbul ignore next*/
		if (!this.client) return;

		try {
			await this.producer.send({
				topic: this.getTopicName(packet.type, packet.target),
				messages: [
					{
						value: data,
						...this.opts.publishMessage
					}
				],
				...this.opts.publish
			});
		} catch (err) {
			this.logger.error("Kafka Publish error", err);

			this.broker.broadcastLocal("$transporter.error", {
				error: err,
				module: "transporter",
				type: C.FAILED_PUBLISHER_ERROR
			});

			throw err;
		}
	}
}

module.exports = KafkaTransporter;
