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

export interface PacketPayload {
	ver: string;
	sender: string | null;
}

export interface PacketDiscoverPayload extends PacketPayload {}
export interface PacketInfoPayload extends PacketPayload {
	services: [Record<string, any>];
	config: Record<string, any>;
	instanceID: string;
	ipList: string[];
	hostname: string;
	client: {
		type: string;
		version: string;
		langVersion: string;
	};
	metadata: Record<string, any>;
}

export interface PacketHeartbeatPayload extends PacketPayload {
	cpu: number;
}

export interface PacketRequestPayload extends PacketPayload {
	id: string;
	action: string;
	params: Record<string, any>;
	meta: Record<string, any>;
	timeout: number;
	level: number;
	tracing: boolean;
	parentID?: string;
	requestID?: string;
	caller?: string;
	stream: boolean;
	seq?: number;
}

export interface PacketResponsePayload extends PacketPayload {
	id: string;
	success: boolean;
	data?: Record<string, any>;
	error?: Record<string, any>;
	meta: Record<string, any>;
	stream: boolean;
	seq?: number;
}

export interface PacketEventPayload extends PacketPayload {
	id: string;
	event: string;
	data?: Record<string, any>;
	meta: Record<string, any>;
	level: number;
	tracing: boolean;
	parentID?: string;
	requestID?: string;
	caller?: string;
	stream: boolean;
	seq?: number;
	groups: string[];
	broadcast: boolean;
}

export interface PacketPingPayload extends PacketPayload {
	id: string;
	time: number;
}

export interface PacketPongPayload extends PacketPayload {
	id: string;
	time: number;
	arrived: number;
}

export interface PacketDisconnectPayload extends PacketPayload {}

export declare class Packet {
	type: PacketType;

	target?: string;

	payload: PacketPayload;

	constructor(type: string, target?: string | null, payload?: any);
}
