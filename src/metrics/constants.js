/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

module.exports = {
	METRIC_TYPE_COUNTER:  "counter",
	METRIC_TYPE_GAUGE:  "gauge",
	METRIC_TYPE_HISTROGRAM:  "histogram",

	METRIC_PROCESS_EVENTLOOP_LAG: "process.eventloop.lag", // msec

	METRIC_PROCESS_MEMORY_HEAP_SIZE_TOTAL: "process.memory.heap.size.total", // bytes
	METRIC_PROCESS_MEMORY_HEAP_SIZE_USED: "process.memory.heap.size.used", // bytes
	METRIC_PROCESS_MEMORY_RSS: "process.memory.rss", // bytes
	METRIC_PROCESS_MEMORY_EXTERNAL: "process.memory.external", // bytes

	METRIC_PROCESS_MEMORY_HEAP_SPACE_SIZE_TOTAL: "process.memory.heap.size.total", // bytes
	METRIC_PROCESS_MEMORY_HEAP_SPACE_SIZE_USED: "process.memory.heap.size.used", // bytes
	METRIC_PROCESS_MEMORY_HEAP_SPACE_SIZE_AVAILABLE: "process.memory.heap.size.available", // bytes

	METRIC_PROCESS_UPTIME: "process.uptime", // seconds
	METRIC_PROCESS_ACTIVE_HANDLES: "process.active.handles",
	METRIC_PROCESS_ACTIVE_REQUESTS: "process.active.requests",

	METRIC_OS_MEMORY_FREE: "os.memory.free", // bytes
	METRIC_OS_MEMORY_TOTAL: "os.memory.TOTAL", // bytes
	METRIC_OS_CPU_COUNT: "os.cpu.count",
	METRIC_OS_UPTIME: "os.uptime", // seconds

	METRIC_OS_CPU_LOAD_1: "os.cpu.load.1",
	METRIC_OS_CPU_LOAD_5: "os.cpu.load.5",
	METRIC_OS_CPU_LOAD_15: "os.cpu.load.15",

	METRIC_OS_CPU_USER: "os.cpu.user", // seconds
	METRIC_OS_CPU_SYSTEM: "os.cpu.system", // seconds
};
