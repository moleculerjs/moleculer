import Endpoint = require("./endpoint");
import type Service from "../service";
import type { EventSchema } from "../context";

declare class EventEndpoint extends Endpoint {
	service: Service;
	event: EventSchema;
}
export = EventEndpoint;
