/*
 * moleculer
 * Copyright (c) 2023 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const { defaultsDeep } = require("lodash");
const Transporter = require("./base");
const C = require("../constants");

/**
 * Import types
 *
 * @typedef {import("./kafka")} KafkaTransporterClass
 * @typedef {import("./kafka").KafkaTransporterOptions} KafkaTransporterOptions
 */

/**
 * Transporter for Kafka
 *
 * @class KafkaTransporter
 * @extends {Transporter}
 * @implements {KafkaTransporterClass}
 */
class KafkaTransporter extends Transporter {
	/**
	 * Creates an instance of KafkaTransporter.
	 *
	 * @param {string|KafkaTransporterOptions?} opts
	 *
	 * @memberof KafkaTransporter
	 */
	constructor(opts) {
		if (typeof opts === "string") {
			opts = { bootstrapBrokers: [opts.replace("kafka://", "")] };
		} else if (opts == null) {
			opts = {};
		}

		opts = /** @type {KafkaTransporterOptions} */ (
			defaultsDeep(opts, {
				// Client ID for all clients
				clientId: "moleculer-kafka",

				// Bootstrap brokers for connection
				bootstrapBrokers: null,

				// Producer options
				producer: {},

				// Consumer options
				consumer: {},

				// Admin options
				admin: {},

				// Publish options
				publish: {},

				// Message options for send
				publishMessage: {
					partition: 0
				}
			})
		);

		// Normalize bootstrapBrokers to array
		if (opts.bootstrapBrokers && !Array.isArray(opts.bootstrapBrokers)) {
			opts.bootstrapBrokers = [opts.bootstrapBrokers];
		}

		super(opts);

		this.producer = null;
		this.consumer = null;
		this.consumerStream = null;
		this.admin = null;
	}

	/**
	 * Connect to the server
	 *
	 * @memberof KafkaTransporter
	 */
	async connect() {
		let Producer, Admin;
		try {
			const kafka = require("@platformatic/kafka");
			Producer = kafka.Producer;
			Admin = kafka.Admin;
		} catch (err) {
			/* istanbul ignore next */
			this.broker.fatal(
				"The '@platformatic/kafka' package is missing. Please install it with 'npm install @platformatic/kafka --save' command.",
				err,
				true
			);
		}

		// Create Producer
		this.producer = new Producer({
			clientId: this.opts.clientId,
			bootstrapBrokers: this.opts.bootstrapBrokers,
			autocreateTopics: true,
			...this.opts.producer
		});

		// Create Admin
		this.admin = new Admin({
			clientId: this.opts.clientId,
			bootstrapBrokers: this.opts.bootstrapBrokers,
			...this.opts.admin
		});

		try {
			// Validate connection by fetching metadata from the broker
			await this.admin.listTopics();

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
		if (this.consumerStream) {
			await this.consumerStream.close();
			this.consumerStream = null;
		}
		if (this.admin) {
			await this.admin.close();
			this.admin = null;
		}
		if (this.producer) {
			await this.producer.close();
			this.producer = null;
		}
		if (this.consumer) {
			await this.consumer.close();
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
		const topicNames = topics.map(({ cmd, nodeID }) => this.getTopicName(cmd, nodeID));

		try {
			// Get list of existing topics
			const existingTopics = await this.admin.listTopics();

			// Filter out topics that already exist
			const topicsToCreate = topicNames.filter(topic => !existingTopics.includes(topic));

			if (topicsToCreate.length > 0) {
				this.logger.debug(
					`Creating ${topicsToCreate.length} new topics...`,
					topicsToCreate
				);
				try {
					await this.admin.createTopics({
						topics: topicsToCreate
					});
				} catch (err) {
					// Another node may have created the same topics in the meantime.
					const subErrors = Array.isArray(err.errors) ? err.errors : [err];
					const onlyAlreadyExists =
						subErrors.length > 0 &&
						subErrors.every(e => e.apiId === "TOPIC_ALREADY_EXISTS");
					if (!onlyAlreadyExists) throw err;

					this.logger.debug(
						"Some topics have been created by another node in the meantime. Skipping topic creation."
					);
				}
			} else {
				this.logger.debug("All topics already exist, skipping creation.");
			}
		} catch (err) {
			this.logger.error("Unable to create topics!", topicNames, err);

			this.broker.broadcastLocal("$transporter.error", {
				error: err,
				module: "transporter",
				type: C.FAILED_TOPIC_CREATION
			});
			throw err;
		}

		// Create Consumer
		try {
			const Consumer = require("@platformatic/kafka").Consumer;

			const consumerOptions = {
				clientId: this.opts.clientId,
				bootstrapBrokers: this.opts.bootstrapBrokers,
				groupId: this.broker.instanceID,
				...this.opts.consumer
			};

			this.consumer = new Consumer(consumerOptions);

			this.consumerStream = await this.consumer.consume({
				topics: topicNames,
				autocommit: true
			});

			// Handle messages from the stream
			this.consumerStream.on("data", async message => {
				const topic = message.topic;
				const cmd = topic.split(".")[1];
				await this.receive(cmd, message.value);
			});

			this.consumerStream.on("error", err => {
				this.logger.error("Kafka Consumer stream error", err.message);
				this.logger.debug(err);

				this.broker.broadcastLocal("$transporter.error", {
					error: err,
					module: "transporter",
					type: C.FAILED_CONSUMER_ERROR
				});
			});

			this.logger.info("The consumer started successfully.");
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
		if (!this.producer) return;

		try {
			await this.producer.send({
				messages: [
					{
						topic: this.getTopicName(packet.type, packet.target),
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

	/**
	 * Subscribe to a command
	 * Not implemented.
	 *
	 * @returns {Promise}
	 *
	 * @memberof BaseTransporter
	 */
	subscribe() {
		/* istanbul ignore next */
		return this.broker.Promise.resolve();
	}

	/**
	 * Subscribe to balanced action commands
	 * Not implemented.
	 *
	 * @returns {Promise}
	 *
	 * @memberof AmqpTransporter
	 */
	subscribeBalancedRequest() {
		/* istanbul ignore next */
		return this.broker.Promise.resolve();
	}

	/**
	 * Subscribe to balanced event command
	 * Not implemented.
	 *
	 * @returns {Promise}
	 *
	 * @memberof AmqpTransporter
	 */
	subscribeBalancedEvent() {
		/* istanbul ignore next */
		return this.broker.Promise.resolve();
	}
}

module.exports = KafkaTransporter;
