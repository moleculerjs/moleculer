import { expectAssignable, expectError, expectNotAssignable, expectType } from "tsd";
import { Context, EventOptions, ServiceBroker } from "../../../index";

const broker = new ServiceBroker({ logger: false });
const ctx = new Context(broker);

// The third parameter of the event sending methods is an options object (or omitted).
expectAssignable<EventOptions>({ groups: ["mail"] });
expectAssignable<EventOptions>({ groups: "mail" });
expectAssignable<EventOptions>({
	groups: ["mail", "payment"],
	throwError: true,
	meta: { user: "john" },
	headers: { contentType: "json" },
	requestID: "req-1",
	parentCtx: ctx,
	parentSpan: { id: "span-1", traceID: "trace-1", sampled: true },
	caller: "users",
	paramsCloning: false
});

// The removed group shorthand is not an `EventOptions`.
expectNotAssignable<EventOptions>("mail");
expectNotAssignable<EventOptions>(["mail"]);
expectNotAssignable<EventOptions>(5);

// broker.emit / broker.broadcast / broker.broadcastLocal
expectType<Promise<void>>(broker.emit("user.created"));
expectType<Promise<void>>(broker.emit("user.created", { id: 5 }));
expectType<Promise<void>>(broker.emit("user.created", { id: 5 }, { groups: ["mail"] }));
expectType<Promise<void>>(broker.emit("user.created", { id: 5 }, { groups: "mail" }));
expectType<Promise<void>>(broker.emit("user.created", { id: 5 }, null));
expectType<Promise<void>>(broker.emit("user.created", { id: 5 }, undefined));
expectError(broker.emit("user.created", { id: 5 }, "mail"));
expectError(broker.emit("user.created", { id: 5 }, ["mail"]));
expectError(broker.emit("user.created", { id: 5 }, 5));

expectType<Promise<void>>(broker.broadcast("user.created"));
expectType<Promise<void>>(broker.broadcast("user.created", { id: 5 }, { groups: ["mail"] }));
expectType<Promise<void>>(broker.broadcast("user.created", { id: 5 }, { throwError: true }));
expectError(broker.broadcast("user.created", { id: 5 }, "mail"));
expectError(broker.broadcast("user.created", { id: 5 }, ["mail"]));

expectType<Promise<void>>(broker.broadcastLocal("user.created"));
expectType<Promise<void>>(broker.broadcastLocal("user.created", { id: 5 }, { groups: ["mail"] }));
expectError(broker.broadcastLocal("user.created", { id: 5 }, "mail"));
expectError(broker.broadcastLocal("user.created", { id: 5 }, ["mail"]));

// ctx.emit / ctx.broadcast
expectType<Promise<void>>(ctx.emit("user.created"));
expectType<Promise<void>>(ctx.emit("user.created", { id: 5 }, { groups: ["mail"] }));
expectType<Promise<void>>(ctx.emit("user.created", { id: 5 }, { meta: { a: 1 } }));
expectError(ctx.emit("user.created", { id: 5 }, "mail"));
expectError(ctx.emit("user.created", { id: 5 }, ["mail"]));

expectType<Promise<void>>(ctx.broadcast("user.created"));
expectType<Promise<void>>(ctx.broadcast("user.created", { id: 5 }, { groups: ["mail"] }));
expectError(ctx.broadcast("user.created", { id: 5 }, "mail"));
expectError(ctx.broadcast("user.created", { id: 5 }, ["mail"]));
