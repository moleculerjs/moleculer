/*
 * moleculer
 * Copyright (c) 2018 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const Promise		= require("bluebird");
const Transporter 	= require("./base");

/**
 * Lightweight transporter for Kafka
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
	 * @memberOf KafkaTransporter
	 */
	constructor(opts) {
		if (typeof opts == "string")
			opts = { kafka: {
				connectionString: opts
			} };

		opts.kafka = Object.assign({
			connectionString: undefined,
			client: {
				zkOptions: undefined,
				noAckBatchOptions: undefined,
				sslOptions: undefined,
			},
			producer: {},
			customPartitioner: undefined,

			consumer: {
				groupId: undefined, // No nodeID at here
				encoding: "buffer"
			},
			consumerPayloads: undefined,

			publish: {
				partition: 0,
				attributes: 0
			}
		}, opts.kafka);

		super(opts);

		this.client = null;
		this.producer = null;
		this.consumer = null;
	}

	/**
	 * Connect to the server
	 *
	 * @memberOf KafkaTransporter
	 */
	connect() {
		const opts = this.opts.kafka;
		opts.consumer.groupId = this.nodeID;

		return new Promise((resolve, reject) => {
			let Kafka;
			try {
				Kafka = require("kafka-node");
			} catch(err) {
				/* istanbul ignore next */
				this.broker.fatal("The 'kafka-node' package is missing. Please install it with 'npm install kafka-node --save' command.", err, true);
			}

			this.client = new Kafka.Client(opts.connectionString,  opts.client.zkOptions, opts.client.noAckBatchOptions, opts.client.sslOptions);
			this.client.once("connect", () => {

				// Create Consumer
				this.consumer = new Kafka.Consumer(this.client, opts.consumerPayloads || [], opts.consumer);

				this.consumer.on("error", e => {
					this.logger.error("Kafka Consumer error", e.message);
					this.logger.debug(e);

					if (!this.connected)
						reject(e);
				});

				this.consumer.on("message", message => {
					const topic = message.topic;
					const cmd = topic.split(".")[1];
					this.messageHandler(cmd, message.value);
				});

				// Create Producer
				this.producer = new Kafka.Producer(this.client, opts.producer, opts.customPartitioner);
				this.producer.on("error", e => {
					this.logger.error("Kafka Producer error", e.message);
					this.logger.debug(e);

					if (!this.connected)
						reject(e);
				});

				this.onConnected().then(resolve);
			});

		});
	}

	/**
	 * Disconnect from the server
	 *
	 * @memberOf KafkaTransporter
	 */
	disconnect() {
		if (this.client) {
			this.client.close(() => {
				this.client = null;
				this.producer = null;
				this.consumer = null;
			});
		}
	}

	/**
	 * Subscribe to a command
	 *
	 * @param {String} cmd
	 * @param {String} nodeID
	 *
	 * @memberOf KafkaTransporter
	 */
	subscribe(cmd, nodeID) {
		return new Promise((resolve, reject) => {
			const topics = [this.getTopicName(cmd, nodeID)];
			this.producer.createTopics(topics, true, (err, data) => {
				if (err) {
					this.logger.error("Unable to create topics!", topics, err);
					return reject(err);
				}

				this.consumer.addTopics(topics, (err, added) => {
					if (err) {
						this.logger.error("Unable to add topic!", topics, err);
						return reject(err);
					}

					resolve();
				});

			});
		});
	}

	/**
	 * Publish a packet
	 *
	 * @param {Packet} packet
	 *
	 * @memberOf KafkaTransporter
	 */
	publish(packet) {
		if (!this.producer) return Promise.resolve();

		return new Promise((resolve, reject) => {
			const data = packet.serialize();
			this.producer.send([{
				topic: this.getTopicName(packet.type, packet.target),
				messages: [data],
				partition: this.opts.kafka.publish.partition,
				attributes: this.opts.kafka.publish.attributes,
			}], (err, result) => {
				if (err) {
					this.logger.error("Publish error", err);
					reject(err);
				}
				resolve();
			});
		});
	}

}

module.exports = KafkaTransporter;
