import { expectAssignable, expectError, expectType } from "tsd";
import { Context, EventOptions, ServiceBroker } from "../../../index";

// `EventOptions` is a closed interface, but custom keys (e.g. read by a middleware)
// can be added with module augmentation. In an application this is
// `declare module "moleculer" { interface EventOptions { ... } }`.
declare module "../../../index" {
	interface EventOptions {
		tenantId?: string;
	}
}

const broker = new ServiceBroker({ logger: false });
const ctx = new Context(broker);

expectAssignable<EventOptions>({ groups: ["mail"], tenantId: "acme" });
expectType<Promise<void>>(broker.emit("user.created", { id: 5 }, { tenantId: "acme" }));
expectType<Promise<void>>(broker.broadcast("user.created", { id: 5 }, { tenantId: "acme" }));
expectType<Promise<void>>(ctx.emit("user.created", { id: 5 }, { tenantId: "acme" }));

// Keys that are not declared are still rejected
expectError(broker.emit("user.created", { id: 5 }, { notAnOption: true }));
expectError(broker.emit("user.created", { id: 5 }, { tenantId: 5 }));
