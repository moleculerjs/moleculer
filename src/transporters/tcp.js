/*
 * moleculer
 * Copyright (c) 2018 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const Promise		= require("bluebird");
const Transporter 	= require("./base");

const P 			= require("../packets");
const { resolvePacketID }	= require("./tcp/constants");

const Parser		= require("./tcp/parser");
//const UdpServer		= require("./tcp/udp-server");
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
			multicastPort: 55200,
			multicastPeriod: 60,

			// TCP options
			port: null, // random port,
			urls: null, // URLs of remote endpoints
			useHostname: true,

			gossipPeriod: 1, // 1 second
			maxKeepAliveConnections: 0,
			keepAliveTimeout: 60,
			maxPacketSize: 64 * 1024 * 1024,
			//ignoreGossipMessagesUntil : 500
		}, this.opts);

		this.reader = null;
		this.writer = null;
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
			.then(() => {
				this.logger.info("TCP Transporter started.");
				this.connected = true;
				return this.onConnected();
			});
	}

	startTcpServer() {
		this.writer = new TcpWriter(this, this.opts);
		this.reader = new TcpReader(this, this.opts);
		return this.reader.listen();
	}

	startUdpServer() {
		/*this.udpServer = new UdpServer(this, this.opts);

		this.udpServer.on("message", (message, rinfo) => {
			const nodeID = message.getFrameData(C.MSG_FRAME_NODEID).toString();
			if (nodeID && nodeID != this.nodeID) {
				let socket = this.connections[nodeID];

				if (!socket) {
					const port = parseInt(message.getFrameData(C.MSG_FRAME_PORT).toString(), 10);
					TcpServer.connect(rinfo.address, port)
						.then(socket => {
							socket.nodeID = nodeID;
							this.connections[nodeID] = socket;

							this.onTcpClientConnected(socket);

							// Send DISCOVER to this node
							const packet = new P.PacketDiscover(this.transit, nodeID);
							this.publish(packet);
						})
						.catch(err => {
							this.logger.warn(`Can't connect to '${nodeID}' on ${rinfo.address}:${port}`, err);
						});
				}
			}
		});

		this.udpServer.on("message error", (err, msg, rinfo) => {
			this.logger.warn("Invalid UDP packet received!", msg.toString(), rinfo);
		});

		return this.udpServer.bind();*/
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
	onTcpClientConnected(socket) {
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
	}

	/**
	 * Close TCP & UDP servers and destroy sockets.
	 *
	 * @memberOf TcpTransporter
	 */
	disconnect() {
		this.connected = false;

		if (this.reader)
			this.reader.close();

		if (this.writer)
			this.writer.close();

		if (this.udpServer)
			this.udpServer.close();
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
		const packetID = resolvePacketID(packet.type);
		const data = packet.serialize();
		return this.writer.send(packet.target, packetID, data);
	}

}

module.exports = TcpTransporter;
