/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const BaseSerializer = require("./base");
const P = require("../packets");
const { MoleculerServerError } = require("../errors");

/**
 * Apache Thrift Serializer for Moleculer
 *
 * http://thrift.apache.org/
 *
 * Download Thrift compiler: https://thrift.apache.org/download
 *
 * @class ThriftSerializer
 */
class ThriftSerializer extends BaseSerializer {

	/**
	 * Initialize Serializer
	 *
	 * @param {any} broker
	 *
	 * @memberof Serializer
	 */
	init(broker) {
		super.init(broker);

		try {
			const Thrift = require("thrift");
			this.TBufferedTransport = Thrift.TBufferedTransport;
			this.TBinaryProtocol = Thrift.TBinaryProtocol;

			const transport = new Thrift.TBufferedTransport(null, (res) => this.serialized = res);
			this.protocol = new Thrift.TBinaryProtocol(transport);

		} catch(err) {
			/* istanbul ignore next */
			this.broker.fatal("The 'thrift' package is missing! Please install it with 'npm install thrift --save' command!", err, true);
		}

		this.packets = require("./thrift/gen-nodejs/packets_types.js");
	}

	getPacketFromType(type) {
		switch(type) {
			case P.PACKET_EVENT: return this.packets.PacketEvent;
			case P.PACKET_REQUEST: return this.packets.PacketRequest;
			case P.PACKET_RESPONSE: return this.packets.PacketResponse;
			case P.PACKET_DISCOVER: return this.packets.PacketDiscover;
			case P.PACKET_INFO: return this.packets.PacketInfo;
			case P.PACKET_DISCONNECT: return this.packets.PacketDisconnect;
			case P.PACKET_HEARTBEAT: return this.packets.PacketHeartbeat;
			case P.PACKET_PING: return this.packets.PacketPing;
			case P.PACKET_PONG: return this.packets.PacketPong;
			case P.PACKET_GOSSIP_HELLO: return this.packets.PacketGossipHello;
			case P.PACKET_GOSSIP_REQ: return this.packets.PacketGossipRequest;
			case P.PACKET_GOSSIP_RES: return this.packets.PacketGossipResponse;
		}
	}


	/**
	 * Serialize custom fields (stringify)
	 *
	 * @param {String} type
	 * @param {Packet} obj
	 * @returns {Packet}
	 * @memberof Serializer
	 */
	serializeCustomFields(type, obj) {
		obj = super.serializeCustomFields(type, obj);

		switch(type) {
			case P.PACKET_REQUEST: {
				if (!obj.stream)
					obj.params = Buffer.from(obj.params);
				break;
			}
			case P.PACKET_RESPONSE: {
				if (obj.data && !obj.stream)
					obj.data = Buffer.from(obj.data);
				break;
			}
		}

		return obj;
	}

	/**
	 * Deserialize custom fields
	 *
	 * @param {String} type
	 * @param {Packet} obj
	 * @returns {Packet}
	 * @memberof Serializer
	 */
	deserializeCustomFields(type, obj) {
		switch(type) {
			case P.PACKET_REQUEST: {
				if (!obj.stream)
					obj.params = obj.params.toString("utf8");
				break;
			}
			case P.PACKET_RESPONSE: {
				if (obj.data && !obj.stream) {
					if (obj.data.length)
						obj.data = obj.data.toString("utf8");
					else
						obj.data = undefined;
				}
				break;
			}
		}

		return super.deserializeCustomFields(type, obj);
	}

	/**
	 * Serializer a JS object to Buffer
	 *
	 * @param {Object} obj
	 * @param {String} type of packet
	 * @returns {Buffer}
	 *
	 * @memberof Serializer
	 */
	serialize(obj, type) {
		const P = this.getPacketFromType(type);
		if (!P) {
			/* istanbul ignore next */
			throw new MoleculerServerError("Invalid packet type!", 500, "INVALID_PACKET_TYPE");
		}

		this.serializeCustomFields(type, obj);

		const t = new P(obj);
		t.write(this.protocol);
		this.protocol.flush();
		return this.serialized;
	}

	/**
	 * Deserialize Buffer to JS object
	 *
	 * @param {Buffer} buf
	 * @param {String} type of packet
	 * @returns {Object}
	 *
	 * @memberof Serializer
	 */
	deserialize(buf, type) {
		const P = this.getPacketFromType(type);
		if (!P) {
			/* istanbul ignore next */
			throw new MoleculerServerError("Invalid packet type!", 500, "INVALID_PACKET_TYPE");
		}

		let obj;
		const transport = this.TBufferedTransport.receiver(reader => {
			const protocol = new this.TBinaryProtocol(reader);
			const t = new P();
			t.read(protocol);
			obj = t;
		});

		transport(buf);

		this.deserializeCustomFields(type, obj);

		return obj;
	}
}

module.exports = ThriftSerializer;
