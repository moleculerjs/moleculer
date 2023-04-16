import ServiceBroker = require("../service-broker");
import MetricRegistry = require("../metrics/registry");
import BaseStrategy = require("../strategies/base");
import type { ActionCatalogListOptions } from "./action-catalog";
import type { Logger } from "../logger-factory";
import type { BrokerRegistryOptions } from "../service-broker";
import type { ServiceSchema } from "../service";

declare class ServiceRegistry {
	broker: ServiceBroker;
	metrics: MetricRegistry;
	logger: Logger;

	opts: BrokerRegistryOptions;

	StrategyFactory: BaseStrategy;

	nodes: any;
	services: any;
	actions: any;
	events: any;

	getServiceList(opts?: ActionCatalogListOptions): ServiceSchema[];
}
export = ServiceRegistry;
