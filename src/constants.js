// @ts-check
/*
 * moleculer
 * Copyright (c) 2023 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

module.exports = {
	// Circuit-breaker states
	CIRCUIT_CLOSE: "close",
	CIRCUIT_HALF_OPEN: "half_open",
	CIRCUIT_HALF_OPEN_WAIT: "half_open_wait",
	CIRCUIT_OPEN: "open",

	// Error list in core modules
	/** @type {String} Emitted when transit fails to process the packet*/
	FAILED_PROCESSING_PACKET: "failedProcessingPacket",
	/** @type {String} Emitted when transit fails to send request packet*/
	FAILED_SEND_REQUEST_PACKET: "failedSendRequestPacket",
	/** @type {String} Emitted when transit fails to send event packet*/
	FAILED_SEND_EVENT_PACKET: "failedSendEventPacket",
	/** @type {String} Emitted when transit fails to send response packet*/
	FAILED_SEND_RESPONSE_PACKET: "failedSendResponsePacket",
	/** @type {String} Emitted when transit fails to discover multiple nodes*/
	FAILED_NODES_DISCOVERY: "failedNodesDiscovery",
	/** @type {String} Emitted when transit fails to discover a single nodes*/
	FAILED_NODE_DISCOVERY: "failedNodeDiscovery",
	/** @type {String} Emitted when transit fails to send an INFO packet*/
	FAILED_SEND_INFO_PACKET: "failedSendInfoPacket",
	/** @type {String} Emitted when transit fails to send a PING packet*/
	FAILED_SEND_PING_PACKET: "failedSendPingPacket",
	/** @type {String} Emitted when transit fails to send a PONG packet*/
	FAILED_SEND_PONG_PACKET: "failedSendPongPacket",
	/** @type {String} Emitted when transit fails to send a HEARTBEAT packet*/
	FAILED_SEND_HEARTBEAT_PACKET: "failedSendHeartbeatPacket",
	/** @type {String} Emitted when broker fails to stop all services*/
	FAILED_STOPPING_SERVICES: "failedServicesStop",
	/** @type {String} Emitted when broker fails to stop all services*/
	FAILED_LOAD_SERVICE: "failedServiceLoad",
	/** @type {String} Emitted when broker fails to stop all services*/
	FAILED_RESTART_SERVICE: "failedServiceRestart",
	/** @type {String} Emitted when broker fails to stop all services*/
	FAILED_DESTRUCTION_SERVICE: "failedServiceDestruction",
	/** @type {String} Emitted when CACHER/DISCOVERER/TRANSPORTER client receives an error*/
	CLIENT_ERROR: "clientError",
	/** @type {String} Emitted when Redis client fails during while pinging the server*/
	FAILED_SEND_PING: "failedSendPing",
	/** @type {String} Emitted when etcd3 discoverer fails to collect the keys*/
	FAILED_COLLECT_KEYS: "failedCollectKeys",
	/** @type {String} Emitted when etcd3 discoverer fails to send INFO packet*/
	FAILED_SEND_INFO: "failedSendInfo",
	/** @type {String} Emitted when Redis discoverer fails to scan the keys*/
	FAILED_KEY_SCAN: "failedKeyScan",
	/** @type {String} Emitted when Redis publisher fails for some reason*/
	FAILED_PUBLISHER_ERROR: "publisherError",
	/** @type {String} Emitted when Redis consumer fails for some reason*/
	FAILED_CONSUMER_ERROR: "consumerError",
	/** @type {String} Emitted when Kafka fails to create topics*/
	FAILED_TOPIC_CREATION: "failedTopicCreation",
	/** @type {String} Emitted when AMQP fails to connect*/
	FAILED_CONNECTION_ERROR: "failedConnection",
	/** @type {String} Emitted when AMQP fails to connect*/
	FAILED_CHANNEL_ERROR: "failedChannel",
	/** @type {String} Emitted when AMQP fails ACK packet*/
	FAILED_REQUEST_ACK: "requestAck",
	/** @type {String} Emitted when AMQP fails for some reason and disconnects*/
	FAILED_DISCONNECTION: "failedDisconnection",
	/** @type {String} Emitted when AMQP fails to publish balanced event*/
	FAILED_PUBLISH_BALANCED_EVENT: "failedPublishBalancedEvent",
	/** @type {String} Emitted when AMQP fails to publish balanced request*/
	FAILED_PUBLISH_BALANCED_REQUEST: "publishBalancedRequest"
};
