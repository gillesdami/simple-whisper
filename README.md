# simple-whisper

[Web3](https://github.com/ethereum/web3.js/) [Whisper](https://web3js.readthedocs.io/en/1.0/web3-shh.html) made simple.

## install

```bash
npm install simple-whisper
#or
yarn add simple-whisper
```

Or include in your html dist/simple-whisper.min.js

This library requiere a Web3 implementation.
If the client is not Web3 1.0 ready, you can provide an [implementation](https://github.com/ethereum/web3.js/)

```bash
npm install web3-1beta
#or
yarn add web3-1beta
```

You can easily test your code on a private node with docker:

```bash
npm run run-local-node
npm run stop-local-node
#or
yarn run-local-node
yarn stop-local-node
```

## use

### simple symetric key channel

```js
const u1 = new SimpleWhisper(new Web3(Web3.givenProvider || 'ws://localhost:8546'));
await Promise.all([
    u1.config({topic: "something"}),
    u1.useNewSymKey("somepass")
]);

u1.subscribe({useSymKey: true}, (message) => {
    console.log(message.payload);
    //>{hello: "world"}
});

const u2 = new SimpleWhisper(new Web3(Web3.givenProvider || 'ws://localhost:8546'));
await Promise.all([
    u2.config({topic: "something"}),
    u2.useNewSymKey("somepass")
]);

u2.post({hello: "world"}, {useSymKey: true});
```

### answer an offer

```js
const u1 = new SimpleWhisper(new Web3(Web3.givenProvider || 'ws://localhost:8546'));
await Promise.all([
    u1.config({topic: "token_market"}),
    u1.useNewSymKey("token_market_key"),
    u1.useNewKeyPair()
]);

u1.subscribe({}, (message) => {
    console.log(`${message.payload.name} (${message.authorSig}) accepted our offer !`);
    //
    ...
});

u1.post({id: 1, offer: {unit: "eth", qte: 0.1} demand: {unit: "btc", qte: 0.1}}, {useSymKey: true, ttl: 60});

const u2 = new SimpleWhisper(new Web3(Web3.givenProvider || 'ws://localhost:8546'));
await Promise.all([
    u2.config({topic: "token_market"}),
    u2.useNewSymKey("token_market_key"),
    u2.useNewKeyPair()
]);

u2.subscribe({useSymKey: true}, (message) => {
    // subscribe to messages from u1 to u2
    u2.subscribeBack((messagePers) => {...})

    if(message.payload.unit === "eth" && ...) {
        //answer using u1 pubKey
        message.postBack({name: "sw", id: message.payload.id});
    }
});
```

### asymetric key

```js
const u1 = new SimpleWhisper(new Web3(Web3.givenProvider || 'ws://localhost:8546'));
await Promise.all([
    u1.config({topic: "something"}),
    u1.useNewKeyPair()
]);

const u2 = new SimpleWhisper(new Web3(Web3.givenProvider || 'ws://localhost:8546'));
await Promise.all([
    u2.config({topic: "something"}),
    u2.useNewKeyPair()
]);

u2.setRemotePublicKey(await u1.getPublicKey());
u1.setRemotePublicKey(await u2.getPublicKey());

u1.subscribe({}, (message) => {
    console.log(message.payload);
    //>{hello: "I'm u2"}
});

u2.subscribe({}, (message) => {
    console.log(message.payload);
    //>{hello: "I'm u1"}
});

u1.post({hello: "I'm u1"});
u2.post({hello: "I'm u2"});
```

## [API](doc/api.md)

## contribute

1. Open an issue to discuss about your ideas
2. Be sure the code 100% tested
3. Be sure the api's docs are up to date
4. Make a PR !

If you have created something awesome using simple-whisper, tell me! I'd love to share it!