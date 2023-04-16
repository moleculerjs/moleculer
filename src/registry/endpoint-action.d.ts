import Endpoint = require("./endpoint");
import type Service = require("../service");
import type { ActionSchema } from "../service";

declare class ActionEndpoint extends Endpoint {
	service: Service;
	action: ActionSchema;
}
export = ActionEndpoint;
