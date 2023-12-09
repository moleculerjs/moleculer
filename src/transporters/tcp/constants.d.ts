export const PACKET_EVENT_ID: number;
export const PACKET_REQUEST_ID: number;
export const PACKET_RESPONSE_ID: number;
export const PACKET_PING_ID: number;
export const PACKET_PONG_ID: number;
export const PACKET_GOSSIP_REQ_ID: number;
export const PACKET_GOSSIP_RES_ID: number;
export const PACKET_GOSSIP_HELLO_ID: number;
export const IGNORABLE_ERRORS: string[];

export function resolvePacketID(type: string): number;
export function resolvePacketType(
	id: number
): "EVENT" | "REQ" | "RES" | "PING" | "PONG" | "GOSSIP_REQ" | "GOSSIP_RES" | "GOSSIP_HELLO";
