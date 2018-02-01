/*
 * moleculer
 * Copyright (c) 2018 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const Promise		= require("bluebird");
const Transporter 	= require("./base");

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

		this.nodes = new Map();

		this.gossipTimer = null;

		// TODO: Disable heartbeat timers and increment offlineTimout in registry
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
				return this.onConnected();
			});
	}

	/**
	 *
	 */
	startTcpServer() {
		this.writer = new TcpWriter(this, this.opts);
		this.reader = new TcpReader(this, this.opts);
		return this.reader.listen();
	}

	/**
	 *
	 */
	startUdpServer() {
		this.udpServer = new UdpServer(this, this.opts);

		this.udpServer.on("message", (nodeID, address, port) => {
			if (nodeID && nodeID != this.nodeID) {
				let node = this.nodes.get(nodeID);
				if (!node) {
					// Unknow node. Register as offline node
					this.addOfflineNode(nodeID, address, port);
				}
			}
		});

		return this.udpServer.bind();
	}

	/**
	 *
	 */
	startTimers() {
		this.gossipTimer = setInterval(() => this.sendGossipRequest(), Math.max(this.opts.gossipPeriod, 1) * 1000);
	}

	/**
	 *
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
		let node = {
			id,
			address,
			port,
			when: 0,
			offlineSince: Date.now()
		};

		this.nodes.set(id, node);

		return node;
	}

	nodeOffline(id) {
		let node = this.nodes.get(id);
		node.offlineSince = Date.now();
	}

	/**
	 *
	 */
	sendGossipRequest() {
		const localNode = this.getLocalNodeInfo();

		let packet = {
			hostname: localNode.hostname,
			port: this.opts.port,
			online: {},
			offline: {}
		};

		// Add local node as online
		packet.online[localNode.id] = [localNode.when, localNode.cpuWhen /* TODO*/, localNode.cpu];

		let onlineCount = 1; // With local
		let offlineCount = 0;
		this.nodes.forEach(node => {
			if (node.offlineSince) {
				packet.offline[node.id] = [node.when, node.offlineSince];
				offlineCount++;
			} else {
				packet.online[node.id] = [node.when, node.cpuWhen /* TODO*/, node.cpu];
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
	 *
	 * @param {Object} data
	 * @param {boolean} toLive
	 */
	sendGossipToRandomEndpoint(data, toLive) {
		const endpoints = [];
		this.nodes.forEach(node => {
			if (toLive && !node.offlineSince)
				endpoints.push(node);
			else if (!toLive && node.offlineSince)
				endpoints.push(node);
		});

		const ep = endpoints[Math.floor(Math.random() * endpoints.length)];
		if (ep) {
			const packet = new PacketGossipRequest(this.transit, ep.id, data);
			this.publish(packet);
		}
	}

	/**
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

	processGossipRequest(packet) {
		// TODO
	}

	processGossipResponse(packet) {
		// TODO
	}

	/**
	 * New TCP socket client is received via TcpServer.
	 * It happens if we broadcast a DISCOVER packet via UDP
	 * and other nodes catch it and connect to our TCP server.
	 * At this point we don't know the socket nodeID. We should
	 * wait for the FIRST DISCOVER packet and expand the NodeID from it.
	 *
	 * @param {Socket} socket
	 * @memberof TcpTransporter
	 */
	/*onTcpClientConnected(socket) {
		socket.setNoDelay();

		const address = socket.address().address;
		//this.logger.info(address);
		this.logger.info(`TCP client '${address}' is connected.`);

		const parser = Message.getParser();
		socket.pipe(parser);

		parser.on("data", message => {
			//this.logger.info(`TCP client '${address}' data received.`);
			//this.logger.info(msg.toString());

			const nodeID = message.getFrameData(C.MSG_FRAME_NODEID).toString();
			if (!nodeID)
				this.logger.warn("Missing nodeID!");

			socket.nodeID = nodeID;
			if (!this.connections[nodeID])
				this.connections[nodeID] = socket;

			const packetType = message.getFrameData(C.MSG_FRAME_PACKETTYPE);
			const packetData = message.getFrameData(C.MSG_FRAME_PACKETDATA);
			if (!packetType || !packetData)
				this.logger.warn("Missing frames!");

			this.messageHandler(packetType.toString(), packetData);
		});

		parser.on("error", err => {
			this.logger.warn("Packet parser error!", err);
		});

		socket.on("error", err => {
			this.logger.warn(`TCP client '${address}' error!`, err);
			this.removeSocket(socket);
		});

		socket.on("close", hadError => {
			this.logger.info(`TCP client '${address}' is disconnected! Had error:`, hadError);
			this.removeSocket(socket);
		});
	}*/

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
	 *
	 */
	getLocalNodeInfo() {
		return this.nodes.get(this.nodeID);
	}

	/**
	 *
	 * @param {*} nodeID
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
		const data = packet.serialize();
		return this.writer.send(packet.target, packetID, data)
			.catch(err => {
				this.nodeOffline(packet.target);
				throw err;
			});
	}

}

module.exports = TcpTransporter;
