
namespace java services.moleculer.serializers.thrift

struct PacketEvent {
	1: string ver,
	2: string sender,
	3: string event,
	4: optional string data,
	5: list<string> groups,
	6: bool broadcast,
}

struct PacketRequest {
	1: string ver,
	2: string sender,
	3: string id,
	4: string action,
	5: optional binary params,
	6: string meta,
	7: double timeout,
	8: i32 level,
	9: optional bool metrics,
	10: optional string parentID,
	11: optional string requestID,
	12: optional bool stream,
	13: optional i32 seq,
}

struct PacketResponse {
	1: string ver,
	2: string sender,
	3: string id,
	4: bool success,
	5: optional binary data,
	6: optional string error,
	7: string meta,
	8: optional bool stream,
	9: optional i32 seq,
}

struct PacketDiscover {
	1: string ver,
	2: string sender,
}

struct Client {
	1: string type,
	2: string version,
	3: string langVersion,
}

struct PacketInfo {
	1: string ver,
	2: string sender,
	3: string services,
	4: string config,

	5: list<string> ipList,
	6: string hostname,
	7: Client client,
	8: string instanceID,
	9: string metadata,
}

struct PacketDisconnect {
	1: string ver,
	2: string sender,
}

struct PacketHeartbeat {
	1: string ver,
	2: string sender,
	3: double cpu,
}

struct PacketPing {
	1: string ver,
	2: string sender,
	3: i64 time,
	4: string id,
}

struct PacketPong {
	1: string ver,
	2: string sender,
	3: i64 time,
	4: i64 arrived,
	5: string id,
}

struct PacketGossipHello {
	1: string ver,
	2: string sender,
	3: string host,
	4: i32 port,
}

struct PacketGossipRequest {
	1: string ver,
	2: string sender,
	3: optional string online,
	4: optional string offline,
}

struct PacketGossipResponse {
	1: string ver,
	2: string sender,
	3: optional string online,
	4: optional string offline,
}
