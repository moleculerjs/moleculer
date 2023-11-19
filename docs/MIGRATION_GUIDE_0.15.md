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

## Minimum Node 18

The minimum supported Node version is changed from Node 10 to Node 18.

## Schema-based serializers (ProtoBuf, Avro, Thrift) are removed

The reason is desribed in this issue: https://github.com/moleculerjs/moleculer/issues/882

If you use one of those, you should change it to one of these schemaless serializers: MsgPack, Notepack.io, JSON, JSONExt, CBOR

## New JSON Extended serializer

We implemented a new JSON serializer which unlike the native JSON serializer, it supports serializing `Buffer`, `BigInt`, `Date`, `Map`, `Set` and `RegExp` classes, as well.

### Example

```js
// moleculer.config.js
{
    serializer: "JSONExt"
}
```

### Custom extensions

You can extend the serializer with custom types.

#### Example to extend with a custom class serializing/deserializing

```js
// MyClass.js
class MyClass {
    constructor(a, b) {
        this.a = a;
        this.b = b;
    }
}
```

```js
// moleculer.config.js
{
    serializer: {
        type: "JSONExt",
        options: {
            customs: [
                {
                    // This is the identifier of the custom type
                    prefix: "AB",
                    
                    // This function checks the type of JSON value
                    check: v => v instanceof MyClass,
                    
                    // Serialize the custom class properties to a String
                    serialize: v => v.a + "|" + v.b,

                    // Deserialize the JSON string to custom class instance and set properties
                    deserialize: v => {
                        const [a, b] = v.split("|");
                        return new MyClass(parseInt(a), b);
                    }
                }
            ]
        }
    }
}
```


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


## New Request headers

We added a new `headers` property in calling options and Context class to store meta information for an action calling or an event emitting. 

The difference between `headers` and `meta` is that the `meta` is always passed to all action calls in a chain and merged, the `headers` is transferred only to the actual action call and not passed to the nested calls.

### Set headers in action calls

```js
broker.call("posts.list", { limit: 100 }, {
    headers: {
        customProp: "customValue"
    }
});
```

> You can use the same way for event emitting or broadcasting.

### Read headers inside action handler

```js
// posts.service.js
module.exports = {
    name: "posts",
    actions: {
        list(ctx) {
            const customProp = ctx.headers.customProp;
        }
    }
};
```

> You can use the same way in event handlers.

### Use header value in cache keys

!TODO!

## Cacher changes

### The `getCacheKey` and `opts.keygen` signature has been changed

Old signature: `getCacheKey(actionName, params, meta, keys, actionKeygen)`

New signature: `getCacheKey(action, opts, ctx)`


### Added `missingResponse` option to cacher options

In 0.14, you could not make a difference between the result cached value is `null` or it's not in the cache. Because both way, the `cacher.get` responded with `null`.

In 0.15, if a cache key is not found in cache, it returns `undefined` by default, or you can change it with `missingResponse` option.

**Example: using a custom symbol to detect missing entries**

```js
const missingSymbol = Symbol("MISSING");

// moleculer.config.js
module.exports = {
    cacher: {
        type: "Memory",
        options: {
            missingResponse: missingSymbol
        }
    }
}

// Get data from cache

const res = await cacher.get("not-existing-key");
if (res === cacher.opts.missingSymbol) {
    console.log("It's not cached.");
}
```

### Cache key generation changed

There are some changes in the serialized values in the cache keys. In previous versions, the `null` and `undefined` values were serialized as `null`, and `"null"` as string also serialized to `null`. 
In 0.15, string values are wrapped into quotes, the `null` is `null` and `undefined` is serialized as `undefined`, so similar serialized values. 

These changes means the 0.15 cachers create different cache keys than 0.14 cachers.

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

## Garbage collector and event-loop metrics removed

Since `gc-stats` and `event-loop-stats` native libraries are not maintained and they are not compatible with newer Node versions, they are removed from the built-in metrics.

**Removed metrics:**
- `process.gc.time`
- `process.gc.total.time`
- `process.gc.executed.total`
- `process.eventloop.lag.min`
- `process.eventloop.lag.avg`
- `process.eventloop.lag.max`
- `process.eventloop.lag.count`

## Rewritten Typescript definition files

!TODO!

## Removed STAN (NATS Streaming) transporter

The STAN (NATS Streaming) transporter has been removed while it's deprecated and not supported by the NATS.io, as well. More info: https://nats-io.gitbook.io/legacy-nats-docs/nats-streaming-server-aka-stan

## Rewritten Kafka transporter (based on kafkajs)

The previous `kafka-node` based transporter has been rewritten to a `kafkajs` based transporter. It means, you should migrate your Kafka Transporter options.




## Removed old NATS transporter (nats@1.x.x) implementation

!TODO!

## The Fastest Validator options changed.

In 0.15 the `useNewCustomCheckFunction` default value is changed from `false` to `true`. It means, if you have old custom checker function in your parameter validation schemas, you should rewrite it to the new custom check function form.

You can see example about migration here: https://github.com/icebob/fastest-validator/blob/master/CHANGELOG.md#new-custom-function-signature

## Other changes

### Better error handling in event handlers.
