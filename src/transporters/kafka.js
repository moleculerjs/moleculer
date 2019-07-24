/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const { defaultsDeep } 	= require("lodash");
const kleur				= require("kleur");
const Promise			= require("bluebird");
const Transporter 		= require("./base");

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
			opts = { host: opts.replace("kafka://", "") };
		} else if (opts == null) {
			opts = {};
		}

		opts = defaultsDeep(opts, {
			// KafkaClient options. More info: https://github.com/SOHU-Co/kafka-node#options
			client: {
				kafkaHost: opts.host
			},

			// KafkaProducer options. More info: https://github.com/SOHU-Co/kafka-node#producerclient-options-custompartitioner
			producer: {},
			customPartitioner: undefined,

			// ConsumerGroup options. More info: https://github.com/SOHU-Co/kafka-node#consumergroupoptions-topics
			consumer: {
			},

			// Advanced options for `send`. More info: https://github.com/SOHU-Co/kafka-node#sendpayloads-cb
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
	 * @memberof KafkaTransporter
	 */
	connect() {
		this.logger.warn(kleur.yellow().bold("Kafka Transporter is an EXPERIMENTAL transporter. Do NOT use it in production yet!"));

		return new Promise((resolve, reject) => {
			let Kafka;
			try {
				Kafka = require("kafka-node");
			} catch(err) {
				/* istanbul ignore next */
				this.broker.fatal("The 'kafka-node' package is missing. Please install it with 'npm install kafka-node --save' command.", err, true);
			}

			this.client = new Kafka.KafkaClient(this.opts.client);

			// Create Producer
			this.producer = new Kafka.Producer(this.client, this.opts.producer, this.opts.customPartitioner);
			this.producer.on("ready", () => {
				/* Moved to ConsumerGroup
				// Create Consumer

				this.consumer = new Kafka.Consumer(this.client, this.opts.consumerPayloads || [], this.opts.consumer);

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
					this.incomingMessage(cmd, message.value);
				});*/

				this.logger.info("Kafka client is connected.");

				this.onConnected().then(resolve);
			});

			/* istanbul ignore next */
			this.producer.on("error", e => {
				this.logger.error("Kafka Producer error", e.message);
				this.logger.debug(e);

				if (!this.connected)
					reject(e);
			});

		});
	}

	/**
	 * Disconnect from the server
	 *
	 * @memberof KafkaTransporter
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
	 * @memberof BaseTransporter
	 */
	makeSubscriptions(topics) {
		topics = topics.map(({ cmd, nodeID }) => this.getTopicName(cmd, nodeID));

		return new Promise((resolve, reject) => {

			this.producer.createTopics(topics, true, (err) => {
				/* istanbul ignore next */
				if (err) {
					this.logger.error("Unable to create topics!", topics, err);
					return reject(err);
				}

				const consumerOptions = Object.assign({
					id: "default-kafka-consumer",
					kafkaHost: this.opts.host,
					groupId: this.nodeID,
					fromOffset: "latest",
					encoding: "buffer",
				}, this.opts.consumer);

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
					this.receive(cmd, message.value);
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
	 * @memberof KafkaTransporter
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
	 * Send data buffer.
	 *
	 * @param {String} topic
	 * @param {Buffer} data
	 * @param {Object} meta
	 *
	 * @returns {Promise}
	 */
	send(topic, data, { packet }) {
		/* istanbul ignore next*/
		if (!this.client) return Promise.resolve();

		return new Promise((resolve, reject) => {
			this.producer.send([{
				topic: this.getTopicName(packet.type, packet.target),
				messages: [data],
				partition: this.opts.publish.partition,
				attributes: this.opts.publish.attributes,
			}], (err) => {
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
