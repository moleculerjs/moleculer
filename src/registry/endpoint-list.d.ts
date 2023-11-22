import BaseStrategy = require("../strategies/base");
import Endpoint = require("./endpoint");
import ActionEndpoint = require("./endpoint-action");
import EventEndpoint = require("./endpoint-event");
import { Registry, ServiceBroker } from "./event-catalog";

declare class EndpointList {
	constructor(registry: Registry, broker: ServiceBroker, name: string, group: string, EndPointFactory?: typeof Endpoint, StrategyFactory?: BaseStrategy, strategyOptions?: Record<string, any>);

	endpoints: (ActionEndpoint | EventEndpoint)[];
}
export = EndpointList;
