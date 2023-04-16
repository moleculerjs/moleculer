import type Service = require("../service");
import type { ActionSchema } from "../service";

declare class ActionEndpoint {
	service: Service;
	action: ActionSchema;
}
export = ActionEndpoint;
