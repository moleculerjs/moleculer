import type ServiceBroker = require("../service-broker");
import type MetricRegistry = require("../metrics/registry");
import type BaseStrategy = require("../strategies/base");
import type { ActionCatalogListOptions } from "./action-catalog";
import type { Logger } from "../logger-factory";
import type { ActionSchema, ServiceEvent } from "../service";
import type ServiceItem = require("./service-item");
import type ServiceCatalog = require("./service-catalog");
import type ActionCatalog = require("./action-catalog");
import type ActionEndpoint = require("./endpoint-action");
import type NodeCatalog = require("./node-catalog");
import type EventCatalog = require("./event-catalog");
import type EndpointList = require("./endpoint-list");
import type Endpoint = require("./endpoint");
import type Node = require("./node");

import type BaseDiscoverer = require("./discoverers/base");
import type { LocalDiscovererOptions } from "./discoverers/local";
import type { Etcd3DiscovererOptions } from "./discoverers/etcd3";
import type { RedisDiscovererOptions } from "./discoverers/redis";

declare namespace ServiceRegistry {
	export interface NodeRawInfo {
		ipList: string[];
		hostname: string;
		instanceID: string;
		client: Record<string, any>;
		config: Record<string, any>;
		port: number | null;
		seq: number;
		metadata: Record<string, any>;
		services: [Record<string, any>];
	}

	type DiscovererConfig = {
		type: "Local";
		options?: LocalDiscovererOptions;
	} | {
		type: "Etcd3";
		options?: Etcd3DiscovererOptions;
	} | {
		type: "Redis";
		options?: RedisDiscovererOptions;
	};

	type DiscovererType = DiscovererConfig["type"];

	export interface RegistryOptions {
		strategy?: typeof BaseStrategy | string;
		strategyOptions?: Record<string, any>;
		preferLocal?: boolean;
		stopDelay?: number;
		discoverer?: DiscovererConfig | BaseDiscoverer | DiscovererType;
	}
}

declare class ServiceRegistry {
	broker: ServiceBroker;
	metrics: MetricRegistry;
	logger: Logger;

	opts: ServiceRegistry.RegistryOptions;

	StrategyFactory: typeof BaseStrategy;

	discoverer: BaseDiscoverer;

	nodes: NodeCatalog;
	services: ServiceCatalog;
	actions: ActionCatalog;
	events: EventCatalog;

	constructor(broker: ServiceBroker);

	init(): void;

	stop(): Promise<void>;

	registerMoleculerMetrics(): void;
	updateMetrics(): void;

	registerLocalService(service: ServiceItem): void;

	registerServices(node: Node, serviceList: Record<string, any>[]): void;

	checkActionVisibility(action: ActionSchema, node: Node): boolean;

	registerActions(node: Node, service: ServiceItem, actions: Record<string, ActionSchema>): void;

	createPrivateActionEndpoint(action: ActionSchema): ActionEndpoint;

	hasService(fullName: string, nodeID: string): boolean;

	getActionEndpoints(actionName: string): EndpointList;

	getActionEndpointByNodeId(actionName: string, nodeID: string): Endpoint;

	unregisterService(fullName: string, nodeID?: string | null): void;
	unregisterServicesByNode(nodeID: string): void;
	unregisterAction(node: Node, actionName: string): void;

	registerEvents(node: Node, service: ServiceItem, events: Record<string, ServiceEvent>): void;
	unregisterEvent(node: Node, eventName: string): void;

	regenerateLocalRawInfo(incSeq: boolean, isStopping?: boolean): ServiceRegistry.NodeRawInfo;

	getLocalNodeInfo(force?: boolean): ServiceRegistry.NodeRawInfo;
	getNodeInfo(nodeID: string): ServiceRegistry.NodeRawInfo;
	processNodeInfo(payload: any): any;

	getNodeList(opts?: ActionCatalogListOptions): ReturnType<NodeCatalog["list"]>;
	getServiceList(opts?: ActionCatalogListOptions): ReturnType<ServiceCatalog["list"]>;
	getActionList(opts?: ActionCatalogListOptions): ReturnType<ActionCatalog["list"]>;
	getEventList(opts?: ActionCatalogListOptions): ReturnType<EventCatalog["list"]>;

	getNodeRawList(): Array<ServiceRegistry.NodeRawInfo>;
}
export = ServiceRegistry;
