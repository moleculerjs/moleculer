import { expectError, expectType } from "tsd";
import { Context, ServiceBroker } from "../../../index";

interface Params {
	id: string;
}

interface Result {
	name: string;
}

declare const ctx: Context;
declare const broker: ServiceBroker;
declare const params: Params;

expectType<Promise<Result>>(ctx.call<Result>("users.get"));
expectType<Promise<Result>>(ctx.call<Result>("users.get", params));
expectType<Promise<Result>>(ctx.call<Result>("users.get", params, { timeout: 100 }));
expectType<Promise<Result>>(ctx.call<Result>("users.get", undefined, { timeout: 100 }));
expectType<Promise<Result>>(ctx.call<Result, Params>("users.get", params));
expectType<Promise<unknown>>(ctx.call("users.get", params));

expectError(ctx.call<Result, Params>("users.get"));
expectError(ctx.call<Result, Params>("users.get", { id: 123 }));
expectError(ctx.call<Result>("users.get", params, { timeout: "100" }));

expectType<Promise<Result>>(broker.call<Result>("users.get"));
expectType<Promise<Result>>(broker.call<Result>("users.get", params));
expectType<Promise<Result>>(broker.call<Result>("users.get", params, { timeout: 100 }));
expectType<Promise<Result>>(broker.call<Result>("users.get", undefined, { timeout: 100 }));
expectType<Promise<Result>>(broker.call<Result, Params>("users.get", params));
expectType<Promise<unknown>>(broker.call("users.get", params));

expectError(broker.call<Result, Params>("users.get"));
expectError(broker.call<Result, Params>("users.get", { id: 123 }));
expectError(broker.call<Result>("users.get", params, { timeout: "100" }));

expectType<Promise<Result>>(broker.callWithoutBalancer<Result>("users.get"));
expectType<Promise<Result>>(broker.callWithoutBalancer<Result>("users.get", params));
expectType<Promise<Result>>(
	broker.callWithoutBalancer<Result>("users.get", params, { timeout: 100 })
);
expectType<Promise<Result>>(
	broker.callWithoutBalancer<Result>("users.get", undefined, { timeout: 100 })
);
expectType<Promise<Result>>(broker.callWithoutBalancer<Result, Params>("users.get", params));
expectType<Promise<unknown>>(broker.callWithoutBalancer("users.get", params));

expectError(broker.callWithoutBalancer<Result, Params>("users.get"));
expectError(broker.callWithoutBalancer<Result, Params>("users.get", { id: 123 }));
expectError(broker.callWithoutBalancer<Result>("users.get", params, { timeout: "100" }));
