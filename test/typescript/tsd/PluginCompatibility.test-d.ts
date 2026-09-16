import { expectAssignable, expectError, expectNotAssignable, expectType } from "tsd";
import {
	type ActionParamSchema,
	type ActionSchema,
	type BrokerOptions,
	type Context,
	type GenericObject,
	type RestSchema,
	type RetryPolicyOptions,
	type Service,
	type ServiceActionsSchema,
	ServiceBroker,
	type ServiceSchema,
	type ServiceSettingSchema
} from "../../../index";

interface PluginSettings extends ServiceSettingSchema {
	authRequired: boolean;
}

interface PluginService extends Service<PluginSettings> {
	enqueue(topic: string): Promise<void>;
}

const params: ActionParamSchema = { id: { type: "string", min: 1 } };
const route: RestSchema = { method: "POST", path: "/documents" };
const action: ActionSchema<PluginService> = {
	params,
	rest: route,
	auth: ["admin"],
	queue: { concurrency: 2 },
	async handler(ctx: Context) {
		expectType<PluginService>(this);
		await this.enqueue(String(ctx.params));
		expectError(this.enqueue(123));
	}
};
const actions: ServiceActionsSchema<PluginService> = { process: action };
const schema: ServiceSchema<PluginSettings, object, object, PluginService> = {
	name: "plugin",
	settings: { authRequired: true, pluginOption: "enabled" },
	actions,
	queues: { documents: { concurrency: 2 } }
};

expectAssignable<ServiceSchema>({ name: "consumer", mixins: [schema] });
expectAssignable<ServiceSettingSchema>({ pluginOption: "enabled" });
expectAssignable<ActionSchema>({ rest: [route, { method: "GET", path: "/documents" }] });
expectAssignable<ActionSchema>({ rest: ["GET /documents", "POST /documents"] });
expectAssignable<ActionSchema>({ rest: "GET /documents" });

expectAssignable<BrokerOptions>({ transporter: "redis://localhost:6379" });
expectAssignable<BrokerOptions>({ transporter: "NATS" });
expectAssignable<BrokerOptions>({ transporter: { type: "TCP", options: { port: 6000 } } });
const retryPolicy: RetryPolicyOptions = { enabled: true, retries: 2 };
expectAssignable<BrokerOptions>({ retryPolicy });

const broker = new ServiceBroker({ logger: false });
const service = broker.createService(schema);
const extensionData: GenericObject = { schema, retryPolicy };
service.pluginRuntimeState = extensionData;
service.pluginMethod();
expectType<string>(service.name);
expectType<ServiceSettingSchema>(service.settings);

expectError<BrokerOptions>({ requestTimeout: "slow" });
expectError<BrokerOptions>({ transporter: 42 });
expectError<RetryPolicyOptions>({ retries: "twice" });
expectError<ActionSchema>({ visibility: "secret" });
expectError<ActionSchema>({ rest: { method: "GEET", path: "/documents" } });
expectError<ServiceSettingSchema>({ $dependencyTimeout: "slow" });
expectError<ServiceSchema>({ name: 42 });
expectNotAssignable<typeof service.name>(42);
