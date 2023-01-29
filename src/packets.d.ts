export declare const PACKET_UNKNOWN = "???";
export declare const PACKET_EVENT = "EVENT";
export declare const PACKET_REQUEST = "REQ";
export declare const PACKET_RESPONSE = "RES";
export declare const PACKET_DISCOVER = "DISCOVER";
export declare const PACKET_INFO = "INFO";
export declare const PACKET_DISCONNECT = "DISCONNECT";
export declare const PACKET_HEARTBEAT = "HEARTBEAT";
export declare const PACKET_PING = "PING";
export declare const PACKET_PONG = "PONG";

export declare const PACKET_GOSSIP_REQ = "GOSSIP_REQ";
export declare const PACKET_GOSSIP_RES = "GOSSIP_RES";
export declare const PACKET_GOSSIP_HELLO = "GOSSIP_HELLO";

export declare const DATATYPE_UNDEFINED = 0;
export declare const DATATYPE_NULL = 1;
export declare const DATATYPE_JSON = 2;
export declare const DATATYPE_BUFFER = 3;

export type PacketType =
	| typeof PACKET_UNKNOWN
	| typeof PACKET_EVENT
	| typeof PACKET_DISCONNECT
	| typeof PACKET_DISCOVER
	| typeof PACKET_INFO
	| typeof PACKET_HEARTBEAT
	| typeof PACKET_REQUEST
	| typeof PACKET_PING
	| typeof PACKET_PONG
	| typeof PACKET_RESPONSE
	| typeof PACKET_GOSSIP_REQ
	| typeof PACKET_GOSSIP_RES
	| typeof PACKET_GOSSIP_HELLO;

type PROTOCOL_VERSION = "4";
export interface PacketPayload {
	ver: PROTOCOL_VERSION;
	sender: string | null;
}

export declare class Packet {
	type: PacketType;

	target?: string;

	payload: PacketPayload;

	constructor(type: string, target: string, payload?: any);
}
