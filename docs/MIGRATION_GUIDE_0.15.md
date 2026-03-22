# Migration guide to v0.15.x

This documentation leads you how you can migrate your project to be compatible with the Moleculer v0.15.x versions.

>Please note, the communication protocol has been changed (v4 -> v5). However all schema-based serializer has been removed from the core repo. It means v0.15 Moleculer nodes will able to communicate with v0.14 nodes, if you disable version checking in broker options: 
>```js
>// moleculer.config.js
>{
>	transit: {
>		disableVersionCheck: true
>	}
>}
>```

## Minimum Node 22
The minimum supported Node version is changed from Node 10 to Node 22.

## Legacy event handler is removed

The legacy event handler signature (`user.created(payload, sender, eventName)`) is removed. You should use the new `Context` based signature which was introduced in version 0.14.

**Legacy event handler**

```js
module.exports = {
    name: "accounts",
    events: {
        "user.created"(payload, sender, eventName) {
            // ...
        }
    }
};
```

**Supported event handler**

```js
module.exports = {
    name: "accounts",
    events: {
        "user.created"(ctx) {
            console.log("Payload:", ctx.params);
            console.log("Sender:", ctx.nodeID);
            console.log("We have also metadata:", ctx.meta);
            console.log("The called event name:", ctx.eventName);

            // ...
        }
    }
};
```

### Deprecated `broker.createService` signature removed

Before mixin implementation if you wanted to extend a service, you had to use the following function call:

```js
broker.createService(ApiGateway, {
    settings: {
        // ...
    }
});
```

Now the second argument signature is removed, you should use the `mixins` feature in service schema:

```js
broker.createService({
    mixins: [ApiGateway],
    settings: {
        // ...
    }
});
```

## EventLegacy tracing export is removed

The `EventLegacy` tracing exporter is removed. Use the `Event` tracing exporter instead.

## New REPL options

In order to the REPL options can be more extensible, a new `replOptions` broker option is introduces. You can use it instead of the old `replCommands` and `replDelimiter` broker options.

**Old REPL options**
```js
// moleculer.config.js
module.exports = {
    replDelimiter: "mol # ",
    replCommands: [
        {
            command: "hello <name>",			
            action(broker, args) {
                // ...
            }
        }
    ]
}
```

**New REPL options**
```js
// moleculer.config.js
module.exports = {
    replOptions: {
        delimiter: "mol # ",
        customCommands: [
            {
                command: "hello <name>",			
                action(broker, args) {
                    // ...
                }
            }
        ]
    }
}
```
> Please note, you should rename the `replCommands` property to `customCommands`, as well.

## New action streaming

The built-in `Stream` sending has been rewritten. Now it accepts `params` besides the `Stream` instance.
The `Stream` parameter moved from `ctx.params` into calling options under a `stream` property.

### Old way to send a stream with extra parameters
The `ctx.params` is not available, because it contains the stream instance. For more properties you had to use `meta`.

```js
ctx.call("file.save", fs.createReadStream(), { meta: { filename: "as.txt" }});
```

### New way to send a stream with extra parameters
The stream instance is passed as a calling options, so you can use `ctx.params` as a normal action call.

```js
ctx.call("file.save", { filename: "as.txt" }, { stream: fs.createReadStream() });
```

### Old way to receive a stream

```js
// file.service.js
module.exports = {
    name: "file",
    actions: {
        save(ctx) {
            const stream = ctx.params;
            const s = fs.createWriteStream(ctx.meta.filename);
            stream.pipe(s);
        }
    }
};
```

### New way to receive a stream

```js
// file.service.js
module.exports = {
    name: "file",
    actions: {
        save(ctx) {
            // The stream is in Context directly
            const stream = ctx.stream;
            const s = fs.createWriteStream(ctx.params.filename);
            stream.pipe(s);
        }
    }
};
```
## Removed deprecated event sending method signature

In previous versions, the `emit`, `broadcast` and `broadcastLocal` methods accept a group `String` or groups as `Array<String>` as third arguments, instead of an `opts`.
This signature is removed, you should always pass an `opts` object as 3rd argument.

**Deprecated way**

```js
broker.emit("user.created", { id: 5 }, ["mail"]);
```

**Supported way**

```js
broker.emit("user.created", { id: 5 }, { groups: ["mail"] });
```

## Removed deprecated middleware as a `Function`
We removed and old and deprecated middleware signature where the middleware was `localAction` function. Now `ServiceBroker` accepts middleware as `Object` only.

**Deprecated middleware**
```js
// moleculer.config.js
module.exports = {
    middlewares: [
        function(handler) {
            // My logic
        }
    ]
}
```

**Supported middleware**
```js
// moleculer.config.js
module.exports = {
    middlewares: [
        {
            name: "MyMiddleware",
            localAction(handler) {
                // My logic
            }
        }
    ]
}
```
## Rewritten Kafka transporter (based on @platformatic/kafka)

The Kafka transporter has been migrated from `kafka-node` → `kafkajs` → `@platformatic/kafka`. The `kafkajs` library is no longer maintained, so the final implementation uses `@platformatic/kafka`.

You need to install `@platformatic/kafka`:
```bash
npm install @platformatic/kafka
```

The configuration options have changed:

```js
// moleculer.config.js
module.exports = {
    transporter: {
        type: "Kafka",
        options: {
            // Client ID for all clients
            clientId: "moleculer-kafka",

            // Bootstrap brokers for connection
            bootstrapBrokers: ["localhost:9092"],

            // Producer options
            producer: {},

            // Consumer options
            consumer: {},

            // Admin options
            admin: {},

            // Advanced options for `send`
            publish: {},

            // Advanced message options for `send`
            publishMessage: {
                partition: 0
            }
        }
    }
}
```

Key migration steps from `kafka-node` or `kafkajs`:
- `client.brokers` → `bootstrapBrokers`
- `client.clientId` → `clientId`
- The `client` wrapper object is removed, options are now top-level
- Install `@platformatic/kafka` instead of `kafkajs` or `kafka-node`

## Custom cacher keygen signatire changed

The old `(actionName, params, meta, keys, headers)` key generator function signature has been changed to `getCacheKey(action, opts, ctx)`. For old parameters, use `action.name`, `ctx.params`, `ctx.meta`, `opt.keys`, `ctx.headers` instead.

### Old way in action definition

```js
module.exports = {
    name: "posts",
    actions: {
        list: {
            cache: {
                keygen: (actionName, params, meta, keys, headers) => {
                    return `${actionName}:${JSON.stringify(params)}`;
                }
            }
            handler(ctx) {
                // Do something...
            }
        }
    }
};
```

### New way to receive a stream

```js
module.exports = {
    name: "posts",
    actions: {
        list: {
            cache: {
                keygen: (action, opts, ctx) => {
                    return `${action.name}:${JSON.stringify(ctx.params)}`;
                }
            }
            handler(ctx) {
                // Do something...
            }
        }
    }
};
```


## The Fastest Validator options changed

In 0.15 the `useNewCustomCheckFunction` default value is changed from `false` to `true`. It means, if you have old custom checker function in your parameter validation schemas, you should rewrite it to the new custom check function form.

You can see example about migration here: https://github.com/icebob/fastest-validator/blob/master/CHANGELOG.md#new-custom-function-signature
