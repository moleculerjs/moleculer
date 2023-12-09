export declare const TYPE_COUNTER = "counter";
export declare const TYPE_GAUGE = "gauge";
export declare const TYPE_HISTOGRAM = "histogram";
export declare const TYPE_INFO = "info";

export declare const PROCESS_ARGUMENTS: "process.arguments";

export declare const PROCESS_PID = "process.pid";
export declare const PROCESS_PPID = "process.ppid";

export declare const PROCESS_MEMORY_HEAP_SIZE_TOTAL = "process.memory.heap.size.total";
export declare const PROCESS_MEMORY_HEAP_SIZE_USED = "process.memory.heap.size.used";
export declare const PROCESS_MEMORY_RSS = "process.memory.rss";
export declare const PROCESS_MEMORY_EXTERNAL = "process.memory.external";

export declare const PROCESS_MEMORY_HEAP_SPACE_SIZE_TOTAL = "process.memory.heap.space.size.total";
export declare const PROCESS_MEMORY_HEAP_SPACE_SIZE_USED = "process.memory.heap.space.size.used";
export declare const PROCESS_MEMORY_HEAP_SPACE_SIZE_AVAILABLE =
	"process.memory.heap.space.size.available";
export declare const PROCESS_MEMORY_HEAP_SPACE_SIZE_PHYSICAL =
	"process.memory.heap.space.size.physical";

export declare const PROCESS_MEMORY_HEAP_STAT_HEAP_SIZE_TOTAL =
	"process.memory.heap.stat.heap.size.total";
export declare const PROCESS_MEMORY_HEAP_STAT_EXECUTABLE_SIZE_TOTAL =
	"process.memory.heap.stat.executable.size.total";
export declare const PROCESS_MEMORY_HEAP_STAT_PHYSICAL_SIZE_TOTAL =
	"process.memory.heap.stat.physical.size.total";
export declare const PROCESS_MEMORY_HEAP_STAT_AVAILABLE_SIZE_TOTAL =
	"process.memory.heap.stat.available.size.total";
export declare const PROCESS_MEMORY_HEAP_STAT_USED_HEAP_SIZE =
	"process.memory.heap.stat.used.heap.size";
export declare const PROCESS_MEMORY_HEAP_STAT_HEAP_SIZE_LIMIT =
	"process.memory.heap.stat.heap.size.limit";
export declare const PROCESS_MEMORY_HEAP_STAT_MALLOCATED_MEMORY =
	"process.memory.heap.stat.mallocated.memory";
export declare const PROCESS_MEMORY_HEAP_STAT_PEAK_MALLOCATED_MEMORY =
	"process.memory.heap.stat.peak.mallocated.memory";
export declare const PROCESS_MEMORY_HEAP_STAT_ZAP_GARBAGE = "process.memory.heap.stat.zap.garbage";

export declare const PROCESS_UPTIME = "process.uptime";
export declare const PROCESS_INTERNAL_ACTIVE_HANDLES = "process.internal.active.handles";

export declare const PROCESS_VERSIONS_NODE = "process.versions.node";

export declare const OS_MEMORY_FREE: "os.memory.free";
export declare const OS_MEMORY_USED: "os.memory.used";
export declare const OS_MEMORY_TOTAL: "os.memory.total";
export declare const OS_UPTIME: "os.uptime";
export declare const OS_TYPE: "os.type";
export declare const OS_RELEASE: "os.release";
export declare const OS_HOSTNAME: "os.hostname";
export declare const OS_ARCH: "os.arch";
export declare const OS_PLATFORM: "os.platform";
export declare const OS_USER_UID: "os.user.uid";
export declare const OS_USER_GID: "os.user.gid";
export declare const OS_USER_USERNAME: "os.user.username";
export declare const OS_USER_HOMEDIR: "os.user.homedir";

export declare const OS_DATETIME_UNIX: "os.datetime.unix";
export declare const OS_DATETIME_ISO: "os.datetime.iso";
export declare const OS_DATETIME_UTC: "os.datetime.utc";
export declare const OS_DATETIME_TZ_OFFSET: "os.datetime.tz.offset";

export declare const OS_NETWORK_ADDRESS: "os.network.address";
export declare const OS_NETWORK_MAC: "os.network.mac";
export declare const OS_CPU_LOAD_1: "os.cpu.load.1";
export declare const OS_CPU_LOAD_5: "os.cpu.load.5";
export declare const OS_CPU_LOAD_15: "os.cpu.load.15";
export declare const OS_CPU_UTILIZATION: "os.cpu.utilization";
export declare const OS_CPU_USER: "os.cpu.user";
export declare const OS_CPU_SYSTEM: "os.cpu.system";
export declare const OS_CPU_TOTAL: "os.cpu.total";
export declare const OS_CPU_INFO_MODEL: "os.cpu.info.model";
export declare const OS_CPU_INFO_SPEED: "os.cpu.info.speed";
export declare const OS_CPU_INFO_TIMES_USER: "os.cpu.info.times.user";
export declare const OS_CPU_INFO_TIMES_SYS: "os.cpu.info.times.sys";

export declare const MOLECULER_NODE_TYPE: "moleculer.node.type";
export declare const MOLECULER_NODE_VERSIONS_MOLECULER: "moleculer.node.versions.moleculer";
export declare const MOLECULER_NODE_VERSIONS_LANG: "moleculer.node.versions.lang";
export declare const MOLECULER_NODE_VERSIONS_PROTOCOL: "moleculer.node.versions.protocol";
export declare const MOLECULER_BROKER_NAMESPACE: "moleculer.broker.namespace";
export declare const MOLECULER_BROKER_STARTED: "moleculer.broker.started";
export declare const MOLECULER_BROKER_LOCAL_SERVICES_TOTAL: "moleculer.broker.local.services.total";
export declare const MOLECULER_BROKER_MIDDLEWARES_TOTAL: "moleculer.broker.middlewares.total";
export declare const MOLECULER_REGISTRY_NODES_TOTAL: "moleculer.registry.nodes.total";
export declare const MOLECULER_REGISTRY_NODES_ONLINE_TOTAL: "moleculer.registry.nodes.online.total";
export declare const MOLECULER_REGISTRY_SERVICES_TOTAL: "moleculer.registry.services.total";
export declare const MOLECULER_REGISTRY_SERVICE_ENDPOINTS_TOTAL: "moleculer.registry.service.endpoints.total";
export declare const MOLECULER_REGISTRY_ACTIONS_TOTAL: "moleculer.registry.actions.total";
export declare const MOLECULER_REGISTRY_ACTION_ENDPOINTS_TOTAL: "moleculer.registry.action.endpoints.total";
export declare const MOLECULER_REGISTRY_EVENTS_TOTAL: "moleculer.registry.events.total";
export declare const MOLECULER_REGISTRY_EVENT_ENDPOINTS_TOTAL: "moleculer.registry.event.endpoints.total";
export declare const MOLECULER_REQUEST_TOTAL: "moleculer.request.total";
export declare const MOLECULER_REQUEST_ACTIVE: "moleculer.request.active";
export declare const MOLECULER_REQUEST_ERROR_TOTAL: "moleculer.request.error.total";
export declare const MOLECULER_REQUEST_TIME: "moleculer.request.time";
export declare const MOLECULER_REQUEST_LEVELS: "moleculer.request.levels";
export declare const MOLECULER_EVENT_EMIT_TOTAL: "moleculer.event.emit.total";
export declare const MOLECULER_EVENT_BROADCAST_TOTAL: "moleculer.event.broadcast.total";
export declare const MOLECULER_EVENT_BROADCASTLOCAL_TOTAL: "moleculer.event.broadcast-local.total";
export declare const MOLECULER_EVENT_RECEIVED_TOTAL: "moleculer.event.received.total";
export declare const MOLECULER_EVENT_RECEIVED_ACTIVE: "moleculer.event.received.active";
export declare const MOLECULER_EVENT_RECEIVED_ERROR_TOTAL: "moleculer.event.received.error.total";
export declare const MOLECULER_EVENT_RECEIVED_TIME: "moleculer.event.received.time";
export declare const MOLECULER_TRANSIT_PUBLISH_TOTAL: "moleculer.transit.publish.total";
export declare const MOLECULER_TRANSIT_RECEIVE_TOTAL: "moleculer.transit.receive.total";
export declare const MOLECULER_TRANSIT_REQUESTS_ACTIVE: "moleculer.transit.requests.active";
export declare const MOLECULER_TRANSIT_STREAMS_SEND_ACTIVE: "moleculer.transit.streams.send.active";
export declare const MOLECULER_TRANSIT_READY: "moleculer.transit.ready";
export declare const MOLECULER_TRANSIT_CONNECTED: "moleculer.transit.connected";
export declare const MOLECULER_TRANSIT_PONG_TIME: "moleculer.transit.pong.time";
export declare const MOLECULER_TRANSIT_PONG_SYSTIME_DIFF: "moleculer.transit.pong.systime-diff";
export declare const MOLECULER_TRANSIT_ORPHAN_RESPONSE_TOTAL: "moleculer.transit.orphan.response.total";
export declare const MOLECULER_TRANSPORTER_PACKETS_SENT_TOTAL: "moleculer.transporter.packets.sent.total";
export declare const MOLECULER_TRANSPORTER_PACKETS_SENT_BYTES: "moleculer.transporter.packets.sent.bytes";
export declare const MOLECULER_TRANSPORTER_PACKETS_RECEIVED_TOTAL: "moleculer.transporter.packets.received.total";
export declare const MOLECULER_TRANSPORTER_PACKETS_RECEIVED_BYTES: "moleculer.transporter.packets.received.bytes";
export declare const MOLECULER_CIRCUIT_BREAKER_OPENED_ACTIVE: "moleculer.circuit-breaker.opened.active";
export declare const MOLECULER_CIRCUIT_BREAKER_OPENED_TOTAL: "moleculer.circuit-breaker.opened.total";
export declare const MOLECULER_CIRCUIT_BREAKER_HALF_OPENED_ACTIVE: "moleculer.circuit-breaker.half-opened.active";
export declare const MOLECULER_REQUEST_FALLBACK_TOTAL: "moleculer.request.fallback.total";
export declare const MOLECULER_REQUEST_BULKHEAD_INFLIGHT: "moleculer.request.bulkhead.inflight";
export declare const MOLECULER_REQUEST_BULKHEAD_QUEUE_SIZE: "moleculer.request.bulkhead.queue.size";
export declare const MOLECULER_EVENT_BULKHEAD_INFLIGHT: "moleculer.event.bulkhead.inflight";
export declare const MOLECULER_EVENT_BULKHEAD_QUEUE_SIZE: "moleculer.event.bulkhead.queue.size";
export declare const MOLECULER_REQUEST_RETRY_ATTEMPTS_TOTAL: "moleculer.request.retry.attempts.total";
export declare const MOLECULER_REQUEST_TIMEOUT_TOTAL: "moleculer.request.timeout.total";
export declare const MOLECULER_CACHER_GET_TOTAL: "moleculer.cacher.get.total";
export declare const MOLECULER_CACHER_GET_TIME: "moleculer.cacher.get.time";
export declare const MOLECULER_CACHER_FOUND_TOTAL: "moleculer.cacher.found.total";
export declare const MOLECULER_CACHER_SET_TOTAL: "moleculer.cacher.set.total";
export declare const MOLECULER_CACHER_SET_TIME: "moleculer.cacher.set.time";
export declare const MOLECULER_CACHER_DEL_TOTAL: "moleculer.cacher.del.total";
export declare const MOLECULER_CACHER_DEL_TIME: "moleculer.cacher.del.time";
export declare const MOLECULER_CACHER_CLEAN_TOTAL: "moleculer.cacher.clean.total";
export declare const MOLECULER_CACHER_CLEAN_TIME: "moleculer.cacher.clean.time";
export declare const MOLECULER_CACHER_EXPIRED_TOTAL: "moleculer.cacher.expired.total";
export declare const MOLECULER_DISCOVERER_REDIS_COLLECT_TOTAL: "moleculer.discoverer.redis.collect.total";
export declare const MOLECULER_DISCOVERER_REDIS_COLLECT_TIME: "moleculer.discoverer.redis.collect.time";
export declare const MOLECULER_DISCOVERER_ETCD_COLLECT_TOTAL: "moleculer.discoverer.etcd.collect.total";
export declare const MOLECULER_DISCOVERER_ETCD_COLLECT_TIME: "moleculer.discoverer.etcd.collect.time";

export declare const UNIT_BIT: "bit";
export declare const UNIT_BYTE: "byte";
export declare const UNIT_KILOBYTES: "kilobyte";
export declare const UNIT_MEGABYTE: "megabyte";
export declare const UNIT_GIGABYTE: "gigabyte";
export declare const UNIT_TERRABYTE: "terrabyte";
export declare const UNIT_PETABYTE: "petabyte";
export declare const UNIT_EXOBYTE: "exabyte";

export declare const UNIT_NANOSECONDS: "nanosecond";
export declare const UNIT_MICROSECONDS: "microsecond";
export declare const UNIT_MILLISECONDS: "millisecond";
export declare const UNIT_SECONDS: "second";
export declare const UNIT_MINUTE: "minute";
export declare const UNIT_HOUR: "hour";
export declare const UNIT_DAY: "day";
export declare const UNIT_WEEK: "week";
export declare const UNIT_MONTH: "month";
export declare const UNIT_YEAR: "year";

export declare const UNIT_HANDLE: "handle";
export declare const UNIT_CPU: "cpu";
export declare const UNIT_GHZ: "GHz";

export declare const UNIT_REQUEST: "request";
export declare const UNIT_CONNECTION: "connection";
export declare const UNIT_PACKET: "packet";
export declare const UNIT_MESSAGE: "message";
export declare const UNIT_STREAM: "stream";
export declare const UNIT_EVENT: "event";
