/*
 * moleculer
 * Copyright (c) 2018 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const Promise		= require("bluebird");
const Transporter 	= require("./base");

const Node 			= require("../registry/node");
const P 			= require("../packets");
const { PacketGossipRequest, PACKET_GOSSIP_REQ, PACKET_GOSSIP_RES  } = require("./tcp/packets");
const { resolvePacketID }	= require("./tcp/constants");

const Parser		= require("./tcp/parser");
const UdpServer		= require("./tcp/udp-broadcaster");
const TcpReader		= require("./tcp/tcp-reader");
const TcpWriter		= require("./tcp/tcp-writer");

/**
 * TCP Transporter with optional UDP discovery ("zero configuration") module.
 *
 * TCP Transporter uses fault tolerant and peer-to-peer <b>Gossip Protocol</b>
 * to discover location and service information about the other nodes
 * participating in a Moleculer Cluster. In Moleculer's P2P architecture all
 * nodes are equal, there is no "leader" or "controller" node, so the cluster is
 * truly horizontally scalable. This transporter aims to run on top of an
 * infrastructure of hundreds of nodes.
 *
 * @class TcpTransporter
 * @extends {Transporter}
 */
class TcpTransporter extends Transporter {

	/**
	 * Creates an instance of TcpTransporter.
	 *
	 * @param {any} opts
	 *
	 * @memberOf TcpTransporter
	 */
	constructor(opts) {
		super(opts);

		this.opts = Object.assign({
			// UDP options
			udpDiscovery: true,
			udpReuseAddr: true,

			multicastHost: "230.0.0.0",
			multicastPort: 4445,
			multicastTTL: 1,
			multicastPeriod: 5,

			// TCP options
			port: null, // random port,
			urls: null, // TODO: URLs of remote endpoints
			useHostname: true, // TODO:

			gossipPeriod: 1, // 1 second
			maxKeepAliveConnections: 0, // TODO
			keepAliveTimeout: 60, // TODO
			maxPacketSize: 1 * 1024 * 1024
		}, this.opts);

		this.reader = null;
		this.writer = null;
		this.udpServer = null;

		this.gossipTimer = null;
	}

	/**
	 * Init transporter
	 *
	 * @param {Transit} transit
	 * @param {Function} messageHandler
	 * @param {Function} afterConnect
	 *
	 * @memberOf BaseTransporter
	 */
	init(transit, messageHandler, afterConnect) {
		super.init(transit, messageHandler, afterConnect);

		if (this.broker) {
			this.registry = this.broker.registry;
			this.nodes = this.registry.nodes;
			this.nodes.disableHeartbeatChecks = true;
			// TODO: Disable heartbeat timers and increment offlineTimout in registry if UDP discovery enabled
		}
	}

	/**
	 * Connect to the server
	 *
	 * @memberOf TcpTransporter
	 */
	connect() {
		return Promise.resolve()
			.then(() => this.startTcpServer())
			.then(() => this.startUdpServer())
			.then(() => this.startTimers())
			.then(() => {
				this.logger.info("TCP Transporter started.");
				this.connected = true;

				// Set the opened TCP port (because it can be a random port)
				const localNode = this.getLocalNodeInfo();
				localNode.port = this.opts.port;

				return this.onConnected();
			});
	}

	/**
	 * Start a TCP server for incoming packets
	 */
	startTcpServer() {
		this.writer = new TcpWriter(this, this.opts);
		this.reader = new TcpReader(this, this.opts);
		return this.reader.listen();
	}

	/**
	 * Start a UDP server for automatic discovery
	 */
	startUdpServer() {
		this.udpServer = new UdpServer(this, this.opts);

		this.udpServer.on("message", (nodeID, address, port) => {
			if (nodeID && nodeID != this.nodeID) {
				let node = this.nodes.get(nodeID);
				if (!node) {
					// Unknown node. Register as offline node
					this.addOfflineNode(nodeID, address, port);
				}
			}
		});

		return this.udpServer.bind();
	}

	/**
	 * Start Gossip timers
	 */
	startTimers() {
		this.gossipTimer = setInterval(() => this.sendGossipRequest(), Math.max(this.opts.gossipPeriod, 1) * 1000);
	}

	/**
	 * Stop Gossip timers
	 */
	stopTimers() {
		if (this.gossipTimer)
			clearInterval(this.gossipTimer);
	}

	/**
	 *
	 * @param {*} id
	 * @param {*} address
	 * @param {*} port
	 */
	addOfflineNode(id, address, port) {
		const node = new Node(id);
		node.local = false;
		node.ipList = [address];
		node.port = port;
		node.hostname = address;
		node.available = false;
		node.when = 0;
		node.offlineSince = Date.now();

		this.nodes.add(node.id, node);

		return node;
	}

	/**
	 * Create and send a Gossip request packet
	 */
	sendGossipRequest() {
		const localNode = this.getLocalNodeInfo();

		let packet = {
			host: localNode.hostname, // TODO
			port: localNode.port,
			online: {},
			offline: {}
		};

		// Add local node as online
		packet.online[localNode.id] = [localNode.when || 0, localNode.cpuWhen || 0, localNode.cpu];

		let onlineCount = 0;
		let offlineCount = 0;
		const list = this.nodes.list();
		list.forEach(node => {
			if (node.offlineSince) {
				packet.offline[node.id] = [node.when || 0, node.offlineSince || 0];
				offlineCount++;
			} else {
				packet.online[node.id] = [node.when || 0, node.cpuWhen || 0, node.cpu];
				onlineCount++;
			}
		});

		if (onlineCount > 0) {
			// Send gossip message to a live endpoint
			this.sendGossipToRandomEndpoint(packet, true);
		}

		if (offlineCount > 0) {
			const ratio = offlineCount / (onlineCount + 1);

			// Random number between 0.0 and 1.0
			const random = Math.random();
			if (random < ratio) {
				// Send gossip message to an offline endpoint
				this.sendGossipToRandomEndpoint(packet, false);
			}
		}
	}

	/**
	 * Send a Gossip request packet to a random endpoint
	 *
	 * @param {Object} data
	 * @param {boolean} online
	 */
	sendGossipToRandomEndpoint(data, online) {
		const endpoints = this.nodes.list().filter(node => {
			if (node.local)
				return false; // Skip local node

			if ((online && !node.offlineSince) || (!online && node.offlineSince))
				return true;
		});

		if (endpoints.length == 0)
			return;

		const ep = endpoints[Math.floor(Math.random() * endpoints.length)];
		if (ep) {
			const packet = new PacketGossipRequest(this.transit, ep.id, data);
			this.publish(packet);
		}
	}

	/**
	 * Process incoming packets
	 *
	 * @param {String} type
	 * @param {Object} message
	 */
	onIncomingMessage(type, message) {
		switch(type) {
			case PACKET_GOSSIP_REQ: return this.processGossipRequest(message);
			case PACKET_GOSSIP_RES: return this.processGossipResponse(message);
			default: return this.messageHandler(type, message);
		}
	}

	processGossipRequest(msg) {
		const packet = P.Packet.deserialize(this.transit, PACKET_GOSSIP_REQ, msg);
		const payload = packet.payload;


	}

	processGossipResponse(msg) {
		const packet = P.Packet.deserialize(this.transit, PACKET_GOSSIP_RES, msg);
		const payload = packet.payload;

	}

	/**
	 * Close TCP & UDP servers and destroy sockets.
	 *
	 * @memberOf TcpTransporter
	 */
	disconnect() {
		this.connected = false;

		this.stopTimers();

		if (this.reader)
			this.reader.close();

		if (this.writer)
			this.writer.close();

		if (this.udpServer)
			this.udpServer.close();
	}

	/**
	 * Get local node info instance
	 */
	getLocalNodeInfo() {
		return this.nodes.localNode;
	}

	/**
	 * Get a node info instance by nodeID
	 *
	 * @param {String} nodeID
	 */
	getNodeInfo(nodeID) {
		return this.nodes.get(nodeID);
	}

	/**
	 * Subscribe to a command
	 *
	 * @param {String} cmd
	 * @param {String} nodeID
	 *
	 * @memberOf TcpTransporter
	 */
	subscribe(cmd, nodeID) {
		return Promise.resolve();
	}

	/**
	 * Publish a packet
	 *
	 * @param {Packet} packet
	 *
	 * @memberOf TcpTransporter
	 */
	publish(packet) {
		if (!packet.target || [
			P.PACKET_EVENT,
			P.PACKET_PING,
			P.PACKET_PONG,
			P.PACKET_REQUEST,
			P.PACKET_RESPONSE,
			PACKET_GOSSIP_REQ,
			PACKET_GOSSIP_RES
		].indexOf(packet.type) == -1)
			return Promise.resolve();

		const packetID = resolvePacketID(packet.type);
		const data = Buffer.from(packet.serialize()); // TODO
		return this.writer.send(packet.target, packetID, data)
			.catch(err => {
				this.nodes.disconnected(packet.target, true);
				throw err;
			});
	}

}

module.exports = TcpTransporter;
