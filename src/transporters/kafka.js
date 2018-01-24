/*
 * moleculer
 * Copyright (c) 2018 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const { defaultsDeep } 	= require("lodash");
const chalk				= require("chalk");
const Promise			= require("bluebird");
const Transporter 		= require("./base");

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
		if (typeof opts == "string") {
			opts = { kafka: {
				host: opts.replace("kafka://", "")
			} };
		} else if (!opts) {
			opts = {
				kafka: {}
			};
		}

		opts.kafka = defaultsDeep(opts.kafka, {
			host: undefined,
			client: {
				zkOptions: undefined,
				noAckBatchOptions: undefined,
				sslOptions: undefined,
			},
			producer: {},
			customPartitioner: undefined,

			consumer: {
			},

			publish: {
				partition: 0,
				attributes: 0
			}
		});

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
		this.logger.warn(chalk.yellow.bold("Kafka Transporter is an EXPERIMENTAL transporter. Do NOT use it in production!"));

		const opts = this.opts.kafka;

		return new Promise((resolve, reject) => {
			let Kafka;
			try {
				Kafka = require("kafka-node");
			} catch(err) {
				/* istanbul ignore next */
				this.broker.fatal("The 'kafka-node' package is missing. Please install it with 'npm install kafka-node --save' command.", err, true);
			}

			this.client = new Kafka.Client(opts.host,  opts.client.zkOptions, opts.client.noAckBatchOptions, opts.client.sslOptions);
			this.client.once("connect", () => {
				/* Moved to ConsumerGroup
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
					console.log(cmd);
					this.messageHandler(cmd, message.value);
				});*/


				// Create Producer
				this.producer = new Kafka.Producer(this.client, opts.producer, opts.customPartitioner);
				/* istanbul ignore next */
				this.producer.on("error", e => {
					this.logger.error("Kafka Producer error", e.message);
					this.logger.debug(e);

					if (!this.connected)
						reject(e);
				});

				this.onConnected().then(resolve);
			});

			/* istanbul ignore next */
			this.client.on("error", e => {
				this.logger.error("Kafka Client error", e.message);
				this.logger.debug(e);

				if (!this.connected)
					reject(e);
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

				if (this.consumer) {
					this.consumer.close(() => {
						this.consumer = null;
					});
				}
			});
		}
	}

	/**
	 * Subscribe to all topics
	 *
	 * @param {Array<Object>} topics
	 *
	 * @memberOf BaseTransporter
	 */
	makeSubscriptions(topics) {
		topics = topics.map(({ cmd, nodeID }) => this.getTopicName(cmd, nodeID));

		return new Promise((resolve, reject) => {

			this.producer.createTopics(topics, true, (err, data) => {
				/* istanbul ignore next */
				if (err) {
					this.logger.error("Unable to create topics!", topics, err);
					return reject(err);
				}

				const consumerOptions = Object.assign({
					id: "default-kafka-consumer",
					host: this.opts.kafka.host,
					groupId: this.nodeID,
					fromOffset: "latest",
					encoding: "buffer",
				}, this.opts.kafka.consumer);

				const Kafka = require("kafka-node");
				this.consumer = new Kafka.ConsumerGroup(consumerOptions, topics);

				/* istanbul ignore next */
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

				this.consumer.on("connect", () => {
					resolve();
				});
			});
		});
	}

	/**
	 * Subscribe to a command
	 *
	 * @param {String} cmd
	 * @param {String} nodeID
	 *
	 * @memberOf KafkaTransporter
	 */
	/*
	subscribe(cmd, nodeID) {
		const topic = this.getTopicName(cmd, nodeID);
		this.topics.push(topic);

		return new Promise((resolve, reject) => {
			this.producer.createTopics([topic], true, (err, data) => {
				if (err) {
					this.logger.error("Unable to create topics!", topic, err);
					return reject(err);
				}

				this.consumer.addTopics([{ topic, offset: -1 }], (err, added) => {
					if (err) {
						this.logger.error("Unable to add topic!", topic, err);
						return reject(err);
					}

					resolve();
				}, false);
			});
		});
	}*/

	/**
	 * Publish a packet
	 *
	 * @param {Packet} packet
	 *
	 * @memberOf KafkaTransporter
	 */
	publish(packet) {
		/* istanbul ignore next */
		if (!this.producer) return Promise.resolve();

		return new Promise((resolve, reject) => {
			const data = packet.serialize();
			this.producer.send([{
				topic: this.getTopicName(packet.type, packet.target),
				messages: [data],
				partition: this.opts.kafka.publish.partition,
				attributes: this.opts.kafka.publish.attributes,
			}], (err, result) => {
				/* istanbul ignore next */
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
