import ServiceBroker = require("../service-broker");
import MetricRegistry = require("../metrics/registry");
import BaseStrategy = require("../strategies/base");
import type { ActionCatalogListOptions } from "./action-catalog";
import type { Logger } from "../logger-factory";
import type { BrokerRegistryOptions } from "../service-broker";
import type { ActionSchema, ServiceEvent } from "../service";
import ServiceItem = require("./service-item");
import ServiceCatalog = require("./service-catalog");
import ActionCatalog = require("./action-catalog");
import ActionEndpoint = require("./endpoint-action");
import NodeCatalog = require("./node-catalog");
import EventCatalog = require("./event-catalog");
import EndpointList = require("./endpoint-list");
import Endpoint = require("./endpoint");
import Node = require("./node");
import Service = require("../service");

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
}

declare class ServiceRegistry {
	broker: ServiceBroker;
	metrics: MetricRegistry;
	logger: Logger;

	opts: BrokerRegistryOptions;

	StrategyFactory: BaseStrategy;

	nodes: NodeCatalog;
	services: ServiceCatalog;
	actions: ActionCatalog;
	events: EventCatalog;

	init(): void;

	stop(): Promise<void>;

	registerMoleculerMetrics(): void;
	updateMetrics(): void;

	registerLocalService(service: Service): void;

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
