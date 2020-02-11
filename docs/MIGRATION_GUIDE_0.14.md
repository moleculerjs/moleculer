# Migration guide to v0.14.x
This documentation leads you how you can migrate your project to be compatible with the Moleculer v0.14.x versions.

>Please note, the communication protocol has been changed. It means the new Moleculer 0.14 nodes can't communicate with old <= 0.13 nodes.

## 1. Check your validation setting in broker options.
The `validation: true` broker options was removed to follow other module configuration. Use `validator` option, instead.

### Disable validator

**Old options**
```js
// moleculer.config.js
module.exports = {
    validation: false
};
```

**New options**
```js
// moleculer.config.js
module.exports = {
    validator: false
};
```

### Use custom validator

**Old options**
```js
// moleculer.config.js
module.exports = {
    validation: true
    validator: new MyCustomValidator()
};
```

**New options**
```js
// moleculer.config.js
module.exports = {
    validator: new MyCustomValidator()
};
```

## 2. Don't use `broker.use`, use `middleware` broker option instead
The `broker.use` has been deprecated in version 0.13 and now it is removed. Use `middleware: []` broker options to define middlewares. 

**Legacy middleware adding**
```js
const broker = new ServiceBroker({});

broker.use(myMiddleware);
```

**New middleware adding**
```js
// moleculer.config.js
module.exports = {
    middlewares: [
        myMiddleware1,
        myMiddleware2,
    ]
};
```

## 3. Don't use middleware shorthand functions
In previous versions you could define middleware which wraps the `localAction` hook with a simple `Function`.
In version 0.14 this legacy shorthand is dropped. When you define a middleware as a `Function`, the middleware handler will call it as an initialization and pass the ServiceBroker instance as a parameter.

**Legacy shorthand middleware definition as a `Function`**
```js
const MyMiddleware = function(next, action) {
    return ctx => next(ctx);
};
```

**Accepted middleware definition**
```js
const MyMiddleware = {
    localAction: function(next, action) {
        return ctx => {
            myLogger.info(`${action.name} has been called`);
            return next(ctx);
        }
    }
};
```

**Accepted middleware definition as a `Function`**

In this case, you have a pointer to the `broker`.
```js
const MyMiddleware = function(broker) {
    // Create a custom named logger
    const myLogger = broker.getLogger("MY-LOGGER");

    return {
        localAction: function(next, action) {
            return ctx => {
                myLogger.info(`${action.name} has been called`);
                return next(ctx);
            }
        }
    }
};
```

## 4. Use the new context-based event handler signature
Moleculer detects the signature if your event handler. If it finds that the signature is `"user.created(ctx) { ... }`, it will call it with Event Context. If not, it will call with old arguments & the 4th argument will be the Event Context, like `"user.created"(payload, sender, eventName, ctx) {...}`

**Legacy event handler signature**
```js
module.exports = {
    name: "accounts",
    events: {
        "user.created"(payload, sender, eventName) {
            ...
        }
    }
};
```

**Legacy event handler signature with context**
```js
module.exports = {
    name: "accounts",
    events: {
        "user.created"(payload, sender, eventName, ctx) {
            ...
        }
    }
};
```

**New context-based event handler signature**
```js
module.exports = {
    name: "accounts",
    events: {
        "user.created"(ctx) {
            // legacy `payload` is in `ctx.params`
            // legacy `sender` is in `ctx.nodeID`
            // legacy `eventName` is in `ctx.eventName`
        }
    }
};
```

### The `localEvent` handler signature in middlewares

Please check the `localEvent` handler signature in your custom middlewares, as well. It should follow the new context-based signature.

**New context-based signature in middleware `localEvent` hook**
```js
// my-middleware.js
module.exports = {
    // Wrap local event handlers
    localEvent(next, event) {
        return (ctx) => {
            return next(ctx);
        };
    },
};
```

## 5. The `node.health` response changed
The `$node.health` action's response has been changed. The `transit` property is removed. To get transit metrics, use the new `$node.metrics` internal action.

## 6. Use the new metrics & tracing features

**Old broker options**
```js
// moleculer.config.js
module.exports = {
    metrics: true,
    metricsRate: 1.0
};
```

**New broker options**
```js
// moleculer.config.js
module.exports = {
    metrics: {
        enabled: true,
    },
    tracing: {
        enabled: true,

        exporters: [
            {
                type: "Zipkin",
                options: {
                    baseURL: "http://zipkin-server:9411",
                }
            },
            {
                type: "Jaeger",
                options: {
                    host: "jaeger-server",
                    port: 6832
                }
            }
        ],

        sampling: {
            rate: 1.0, // 0.0 - Never, 1.0 > x > 0.0 - Fix, 1.0 - Always
            tracesPerSecond: null, // 1: 1 trace / sec, 5: 5 traces / sec, 0.1: 1 trace / 10 secs
            minPriority: null
        },

        actions: true,
        events: false,

        errorFields: ["name", "message", "code", "type", "data"],
        stackTrace: false,

        defaultTags: null,
    }
};
```

**Old way to add params & meta fields to tracing spans**
```js
// posts.service.js
module.exports = {
    name: "posts",
    actions: {
        get: {
            metrics: {
                params: ["id"],
                meta: ["loggedIn.username"],
            },
            async handler(ctx) {
                // ...
            }
        }
    }
});
```

**New way to add params, meta or response fields to tracing spans**
```js
// posts.service.js
module.exports = {
    name: "posts",
    actions: {
        get: {
            tracing: {
                tags: {
                    params: ["id"],
                    meta: ["loggedIn.username"],
                    response: ["id", "title"] // add data to tags from the action response.
            },
            async handler(ctx) {
                // ...
            }
        }
    }
});
```

## 6. Use a new built-in logger instead of a custom logger.
The whole logging function has been rewritten in this version. It means, it has a lot of new features, but the configuration of loggers has contains breaking changes.

**Old way to use an external logger**
```js
// moleculer.config.js
module.exports = {
    logger: bindings => pino.child(bindings),
};
```

**New way to use external logger**
```js
// moleculer.config.js
module.exports = {
    logger: "Pino",
};
```

or

```js
// moleculer.config.js
module.exports = {
    logger: {
        type: "Pino",
        options: {
            // Logging level
            level: "info",

            pino: {
                // More info: http://getpino.io/#/docs/api?id=options-object
                options: null,

                // More info: http://getpino.io/#/docs/api?id=destination-sonicboom-writablestream-string
                destination: "/logs/moleculer.log",
            }
        }
    }
};
```

>[Read more about new logging feature and all supported loggers.](https://moleculer.services/docs/0.14/logging.html)

## 7. Bluebird is dropped
The Bluebird Promise library has been dropped from the project because as of Node 10, the native `Promise` implementation is [faster (2x)](https://github.com/icebob/js-perf-benchmark/blob/95803284dcb46c403eb71f2f114b76bf669189ce/suites/promise.js#L123-L133) than Bluebird.

If you want to use Bluebird instead of native Promise, just set the `Promise` broker options.

```js
const BluebirdPromise = require("bluebird");

// moleculer.config.js
module.exports = {
    Promise: BluebirdPromise
};
```
>Please note, the given Promise library will be polyfilled with `delay`, `method`, `timeout` and `mapSeries` methods (which are used inside Moleculer modules).

If you are using Typescript you will need to augment the moleculer declarations to override the returned promise type from Bluebird.  You will need to have a .d.ts file with the following code when you compile:
```ts
import Bluebird from "bluebird";
declare module "moleculer" {
  type Promise<T> = Bluebird<T>;
}
```

Additionally, if you were using `PromiseLike<T>` as a type for anything being returned by moleculer, this will need to be converted to `Promise<T>`, regardless of whether you are using native promises or third-party promises.

## 8. Typescript definitions more strict
The 0.13 release was very loose on the typings for `params` and `meta` for the `Context` class and the `call`, `emit`, and `broadcast` methods from the `Context` and `ServiceBroker` classes.  If Generics were not provided to these types, the default behavior would return `any`:
```ts
type GenericObject = { [name: string]: any };
...
class Context<P = GenericObject, M = GenericObject> {
  ...
  params: P;
  meta: M;
  ...
  call<T = any, P extends GenericObject = GenericObject>(actionName: string, params?: P, opts?: GenericObject): PromiseLike<T>;
  emit<D = any>(eventName: string, data: D, groups: Array<string>): void;
  emit<D = any>(eventName: string, data: D, groups: string): void;
  emit<D = any>(eventName: string, data: D): void;
  broadcast<D = any>(eventName: string, data: D, groups: Array<string>): void;
  broadcast<D = any>(eventName: string, data: D, groups: string): void;
  broadcast<D = any>(eventName: string, data: D): void;
```

Without providing generic overrides, these types afforded absolutely no type safety because your incoming `params` and `meta` in `Context` were all typed as `any`, the return value from `call` would be typed as `any`, the parameters provided to `call` would allow for any object, and the payload provided to `emit` and `broadcast` could be `any`.

In 0.14, the default signature has been tightened up as the following:
```ts
class Context<P = unknown, M extends object = {}> {
  ...
  params: P;
  meta: M;
  ...
  call<T>(actionName: string): PromiseLike<T>;
  call<T, P>(actionName: string, params: P, opts?: GenericObject): PromiseLike<T>;

  emit<D>(eventName: string, data: D, opts: GenericObject): PromiseLike<void>;
  emit<D>(eventName: string, data: D, groups: Array<string>): PromiseLike<void>;
  emit<D>(eventName: string, data: D, groups: string): PromiseLike<void>;
  emit<D>(eventName: string, data: D): PromiseLike<void>;
  emit(eventName: string): PromiseLike<void>;

  broadcast<D>(eventName: string, data: D, opts: GenericObject): PromiseLike<void>;
  broadcast<D>(eventName: string, data: D, groups: Array<string>): PromiseLike<void>;
  broadcast<D>(eventName: string, data: D, groups: string): PromiseLike<void>;
  broadcast<D>(eventName: string, data: D): PromiseLike<void>;
  broadcast(eventName: string): PromiseLike<void>;
```

Effectively, if generics are not provided then `params` will be typed as `unknown` and `meta` will be typed as an empty object.  The `return` value of `call` will be `unknown`.  You could pass any payload to `emit` and `broadcast` without any validation.  Since moleculer is calling services and passing parameters over the wire, it cannot discern what the type of params and called action return values is without guidance.  The generics provide that guidance and allow for type safety in your application.

If you've already been providing generics to these types then congratulations(!), there is nothing you need to do.  If you have not been providing generics to these types then you are likely to find that you will be getting type errors because values that were previously typed as `any` will now be `unknown`.  You will need to update your types to provide types for these generics to avoid the type errors.

There are a couple approaches to remedying these type issues:
1. (**recommended**) Provided proper types for these generics in `Context`, `call`, `emit`, and `broadcast`.  You will now have type safety for your `ctx.params`, `ctx.meta`, return values from `call`, `params` passed to `call`, and payloads passed to `emit` and `broadcast`.
2. (not recommended) Augment the moleculer module with your own local TS definitions that revert these types to their previous behavior.  This will make your code work exactly as it was previously, with no type safety afforded.
3. (not recommended) Replace all uses of the `Context` type in your application with `Context<GenericObject, GenericObject>`, `call` with `call<any, GenericObject>`, `emit` with `emit<any>` and `broadcast` with `broadcast<any>`.  As with #2, you will still not have type safety, but it may represent a quick and dirty approach.

**NOTE:** The examples above show the changes to the `Context` class but similar changes were made to the `ServiceBroker` class as well.  Any changes that you need to make for `Context` will be needed for `ServiceBroker` as well.

**:tada: Well, you are done! :clap:**

Happy coding in your up-to-date Moleculer project. If you need help, join to [Discord chat](https://discord.gg/j5cJYdu) and don't hesitate to ask Moleculer community.
