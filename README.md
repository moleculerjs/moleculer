![Moleculer logo](docs/assets/logo.png)

[![Build Status](https://travis-ci.org/moleculerjs/moleculer.svg?branch=master)](https://travis-ci.org/moleculerjs/moleculer)
[![Coverage Status](https://coveralls.io/repos/github/moleculerjs/moleculer/badge.svg?branch=master)](https://coveralls.io/github/moleculerjs/moleculer?branch=master)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/ec4dab24e4ea4c1eb0d1590f12c81a46)](https://www.codacy.com/app/mereg-norbert/moleculer?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=moleculerjs/moleculer&amp;utm_campaign=Badge_Grade)
[![Maintainability](https://api.codeclimate.com/v1/badges/05ef990fe1ccb3e56067/maintainability)](https://codeclimate.com/github/moleculerjs/moleculer/maintainability)
[![David](https://img.shields.io/david/moleculerjs/moleculer.svg)](https://david-dm.org/moleculerjs/moleculer)
[![Known Vulnerabilities](https://snyk.io/test/github/moleculerjs/moleculer/badge.svg)](https://snyk.io/test/github/moleculerjs/moleculer)
[![Join the chat at https://gitter.im/moleculerjs/moleculer](https://badges.gitter.im/moleculerjs/moleculer.svg)](https://gitter.im/moleculerjs/moleculer?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

[![Downloads](https://img.shields.io/npm/dm/moleculer.svg)](https://www.npmjs.com/package/moleculer)
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fmoleculerjs%2Fmoleculer.svg?type=shield)](https://app.fossa.io/projects/git%2Bgithub.com%2Fmoleculerjs%2Fmoleculer?ref=badge_shield)
[![Patreon](docs/assets/patreon.svg)][patreon] [![PayPal](docs/assets/paypal_donate.svg)][paypal]
[![Backers on Open Collective](https://opencollective.com/moleculer/backers/badge.svg)](#backers) 
[![Sponsors on Open Collective](https://opencollective.com/moleculer/sponsors/badge.svg)](#sponsors) 

# Moleculer [![NPM version](https://img.shields.io/npm/v/moleculer.svg)](https://www.npmjs.com/package/moleculer) [![Twitter URL](https://img.shields.io/twitter/url/http/shields.io.svg?style=social&logo=twitter)](https://twitter.com/intent/tweet?text=Moleculer%20is%20a%20modern%20microservices%20framework%20for%20Node.js&url=https://github.com/moleculerjs/moleculer&via=MoleculerJS&hashtags=nodejs,javascript,microservices)


Moleculer is a fast, modern and powerful microservices framework for Node.js (>= v6.x).
<!--
![](https://img.shields.io/badge/performance-%2B50%25-brightgreen.svg)
![](https://img.shields.io/badge/performance-%2B5%25-green.svg)
![](https://img.shields.io/badge/performance---10%25-yellow.svg)
![](https://img.shields.io/badge/performance---42%25-red.svg)
-->

**Website**: [https://moleculer.services](https://moleculer.services)

**Documentation**: [https://moleculer.services/docs](https://moleculer.services/docs)

# What's included

- Promise-based solution
- request-reply concept
- support event driven architecture with balancing
- built-in service registry
- dynamic service discovery
- load balanced requests & events (round-robin, random, cpu-usage)
- supports middlewares
- service mixins
- multiple services on a node/server
- built-in caching solution (memory, Redis)
- pluggable transporters (TCP, NATS, MQTT, Redis, NATS Streaming, Kafka)
- pluggable serializers (JSON, Avro, MsgPack, Protocol Buffer)
- pluggable validator
- all nodes are equal, no master/leader node
- parameter validation with [fastest-validator](https://github.com/icebob/fastest-validator)
- distributed timeout handling with fallback response
- health monitoring, metrics & statistics
- supports versioned services
- official [API gateway module](https://github.com/moleculerjs/moleculer-web) and many other modules...

# Installation
```
$ npm install moleculer --save
```
or
```
$ yarn add moleculer
```

# Create your first microservice
This example shows you how to create a small service with an `add` action which can add two numbers.
```js
const { ServiceBroker } = require("moleculer");

let broker = new ServiceBroker({ logger: console });

broker.createService({
    name: "math",
    actions: {
        add(ctx) {
            return Number(ctx.params.a) + Number(ctx.params.b);
        }
    }
});

broker.start();

// Call service
broker.call("math.add", { a: 5, b: 3 })
    .then(res => console.log("5 + 3 =", res))
    .catch(err => console.error(`Error occured! ${err.message}`));
```
[Try it on Runkit](https://runkit.com/icebob/moleculer-quick-example)

# Create a Moleculer project
Use the Moleculer CLI tool to create a new Moleculer based microservices project.

1. Install [moleculer-cli](https://github.com/moleculerjs/moleculer-cli) globally
    ```bash
    $ npm install moleculer-cli -g
    ```
2. Create a new project (named `first-demo`)
    ```bash
    $ moleculer init project first-demo
    ```
    > Press Y on API Gateway & `npm install`
    
3. Open project folder
    ```bash
    $ cd first-demo
    ```
    
4. Start project
    ```bash
    $ npm run dev
    ```
5. Open the http://localhost:3000/greeter/welcome?name=world link in your browser. It will call the `welcome` action of `greeter` service with a `name` param via [API gateway](https://github.com/moleculerjs/moleculer-web) and returns with the result.

:tada:**Congratulations! Your first Moleculer based microservices project is created. Read our [documentation](https://moleculer.services/docs) to learn more about Moleculer.**

# Official modules
We have many official modules for Moleculer. [Check our list!](https://moleculer.services/0.12/docs/modules.html)

# Supporting
Moleculer is an open source project. It is free to use for your personal or commercial projects. However, developing it takes up all my free time to make it better and better on a daily basis. If you like Moleculer framework, **[please support it][patreon]**. 

Thank you very much!

# Documentation
You can find here [the documentation](https://moleculer.services/docs).

# Changelog
See [CHANGELOG.md](CHANGELOG.md).

# Contributions
We welcome you to join to the development of Moleculer. Please read our [contribution guide](http://moleculer.services/docs/contributing.html).

## Contributors

This project exists thanks to all the people who contribute. [[Contribute](CONTRIBUTING.md)].
<a href="graphs/contributors"><img src="https://opencollective.com/moleculer/contributors.svg?width=890&button=false" /></a>


## Backers

Thank you to all our backers! 🙏 [[Become a backer](https://opencollective.com/moleculer#backer)]

<a href="https://opencollective.com/moleculer#backers" target="_blank"><img src="https://opencollective.com/moleculer/backers.svg?width=890"></a>


## Sponsors

Support this project by becoming a sponsor. Your logo will show up here with a link to your website. [[Become a sponsor](https://opencollective.com/moleculer#sponsor)]

<a href="https://opencollective.com/moleculer/sponsor/0/website" target="_blank"><img src="https://opencollective.com/moleculer/sponsor/0/avatar.svg"></a>
<a href="https://opencollective.com/moleculer/sponsor/1/website" target="_blank"><img src="https://opencollective.com/moleculer/sponsor/1/avatar.svg"></a>
<a href="https://opencollective.com/moleculer/sponsor/2/website" target="_blank"><img src="https://opencollective.com/moleculer/sponsor/2/avatar.svg"></a>
<a href="https://opencollective.com/moleculer/sponsor/3/website" target="_blank"><img src="https://opencollective.com/moleculer/sponsor/3/avatar.svg"></a>
<a href="https://opencollective.com/moleculer/sponsor/4/website" target="_blank"><img src="https://opencollective.com/moleculer/sponsor/4/avatar.svg"></a>
<a href="https://opencollective.com/moleculer/sponsor/5/website" target="_blank"><img src="https://opencollective.com/moleculer/sponsor/5/avatar.svg"></a>
<a href="https://opencollective.com/moleculer/sponsor/6/website" target="_blank"><img src="https://opencollective.com/moleculer/sponsor/6/avatar.svg"></a>
<a href="https://opencollective.com/moleculer/sponsor/7/website" target="_blank"><img src="https://opencollective.com/moleculer/sponsor/7/avatar.svg"></a>
<a href="https://opencollective.com/moleculer/sponsor/8/website" target="_blank"><img src="https://opencollective.com/moleculer/sponsor/8/avatar.svg"></a>
<a href="https://opencollective.com/moleculer/sponsor/9/website" target="_blank"><img src="https://opencollective.com/moleculer/sponsor/9/avatar.svg"></a>



# License
Moleculer is available under the [MIT license](https://tldrlegal.com/license/mit-license).

[3rd party licenses](https://app.fossa.io/reports/09fc5b4f-d321-4f68-b859-8c61fe3eb6dc)

# Contact
Copyright (c) 2016-2018 MoleculerJS

[![@moleculerjs](https://img.shields.io/badge/github-moleculerjs-green.svg)](https://github.com/moleculerjs) [![@MoleculerJS](https://img.shields.io/badge/twitter-MoleculerJS-blue.svg)](https://twitter.com/MoleculerJS)

[paypal]: https://paypal.me/meregnorbert/50usd
[patreon]: https://www.patreon.com/bePatron?u=6245171
