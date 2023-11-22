import ServiceBroker = require("../service-broker");
import MetricRegistry = require("../metrics/registry");
import BaseStrategy = require("../strategies/base");
import type { ActionCatalogListOptions } from "./action-catalog";
import type { Logger } from "../logger-factory";
import type { BrokerRegistryOptions } from "../service-broker";
import ServiceCatalog = require("./service-catalog");
import ActionCatalog = require("./action-catalog");
import NodeCatalog = require("./node-catalog");
import EventCatalog = require("./event-catalog");
import Node = require("./node");

declare namespace ServiceRegistry {}

declare class ServiceRegistry {
	broker: ServiceBroker;
	metrics: MetricRegistry;
	logger: Logger;

	opts: BrokerRegistryOptions;

	StrategyFactory: BaseStrategy;

	nodes: any;
	services: any;
	actions: ActionCatalog;
	events: any;

	getServiceList(opts?: ActionCatalogListOptions): Promise<ReturnType<ServiceCatalog["list"]>>;

	getNodeList(opts?: ActionCatalogListOptions): Promise<ReturnType<NodeCatalog["list"]>>;

	getActionList(opts?: ActionCatalogListOptions): Promise<ReturnType<ActionCatalog["list"]>>;

	getEventList(opts?: ActionCatalogListOptions): Promise<ReturnType<EventCatalog["list"]>>;

	updateMetrics(): void;

	registerServices(node: Node, serviceList: Record<string, any>[]): void;
	unregisterServicesByNode(nodeID: string): void;
}
export = ServiceRegistry;
