import os = require("os");
import type { NodeHealthStatus } from "./service-broker";

export function getHealthStatus(): NodeHealthStatus;

export function getCpuInfo(): NodeHealthStatus["cpu"];
export function getMemoryInfo(): NodeHealthStatus["mem"];
export function getOsInfo(): NodeHealthStatus["os"];
export function getProcessInfo(): NodeHealthStatus["process"];
export function getClientInfo(): NodeHealthStatus["client"];
export function getNetworkInterfacesInfo(): NodeHealthStatus["net"];
export function getDateTimeInfo(): NodeHealthStatus["time"];
