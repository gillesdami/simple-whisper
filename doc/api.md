# simple-whisper API

## Content

- [SimpleWhisper](#SimpleWhisper)
  - constructor
  - post
  - subscribe
  - unsubscribe
  - getPublicKey
  - setRemotePublicKey
  - getPrivateKey
  - getSymKey
  - config
  - useNewKeyPair
  - useNewSymKey
  - toTopic
  - isTopic
- [Whisper](#Whisper)
  - constructor
  - postBack
  - subscribeBack

## SimpleWhisper

The following properties can be accessed:

- web3: `Web3` An instance of Web3 version 1.0 .
- subscriptions: `Map<subscriptionId, fn>` A map of all active subscriptions.
- options: `Object` Default values for post and subscribe.
- info: `Object|undefined` Object returned by web3.shh.getInfo().

### constructor(web3: Web3): SimpleWhisper

- web3 is a [Web3](https://github.com/ethereum/web3.js/) 1.0 instance. If the users browser is web3 1.0 ready Web3.givenProvider should exist, else you should provide fallback eth node.

```js
const sw = new SimpleWhisper(new Web3(Web3.givenProvider || 'ws://localhost:8546'))
```

### post(payload: any, options: Object): Promise\<string>

Send a payload on the network encrypted using pubKey or symKey if the option useSymKey is trully.

- payload may be any serialisable object via JSON.stringify
- options may contain the following keys:
  - useSymKey: `boolean` If true it will encrypt the message using the symKey instead of the pubKey.
  - symKeyID: `string` Ignored if useSymKey is falsy. ID of symmetric key for message encryption.
  - pubKey: `string` Ignored if pubKey is falsy. The public key for message encryption.
  - sig: `string` The ID of the signing key.
  - ttl: `number` Time-to-live in seconds.
  - topic: `string` 4 Bytes message topic.
  - padding: `number` Padding
  - powTime: `number` Maximal time in seconds to be spent on proof of work.
  - powTarget: `number` Minimal PoW target required for this message.
  - targetPeer: `number` Peer ID

All options except useSymKey will default to their value in this.options.

```js
// in this example keys were registered with setRemotePublicKey and useNewSymKey
// using key pair
sw.post({"some": "message"});
// using sym key
sw.post({"another message"}, {useSymKey: true});
```

### subscribe(options: Object, cb: fn): number

Subscribe for incoming whisper messages. Return the subscription ID used to unsubscribe.

- options may contain the following keys:
  - useSymKey: `boolean` If true the privateKeyID will be ignored, else the symKeyID will be ignored.
  - symKeyID: `string` ID of symmetric key for message decryption.
  - privateKeyID: `string` ID of private (asymmetric) key for message decryption.
  - sig: `string` Public key of the signature, to verify.
  - topics: `string[]` Array (optional when “privateKeyID” key is given): Filters messages by this topic(s). Each topic must be a 4 bytes HEX string.
  - minPow: `number` Minimal PoW requirement for incoming messages.
  - allowP2P: `boolean` Indicates if this filter allows processing of direct peer-to-peer messages (which are not to be forwarded any further, because they might be expired). This might be the case in some very rare cases, e.g. if you intend to communicate to MailServers, etc.
- fn function that will be called with a Whisper as parameter everytime a whisper message is received by this subscription.

```js
// in this example keys were registered with setRemotePublicKey and useNewSymKey
// using key pair
const subkey = sw.subscribe({}, (whisper) => console.log(whisper.payload));
// using sym key
const subkey = sw.subscribe({useSymKey: true}, (whisper) => console.log(whisper.payload));
```

### unsubscribe(subkey: number): boolean

Unsubscribe from a previews subscription. Return true if the subscription was successfully removed.

- subkey is a number returned by subscribe.

```js
sw.unsubscribe(subkey);
```

### getPublicKey(id: string): Promise\<string>

Returns the public key for a key pair ID.

- id default to this.options.sig

```js
console.log("the key used to sign the messages is "+sw.getPublicKey());
```

### setRemotePublicKey(pubKey: string): void

Set this.options.pubKey which is used as default pubKey for sending messages.

- pubkey A public key

### getPrivateKey(id: string): Promise\<string>

Returns the private key for a key pair ID

- id Default to this.options.privateKeyID

```js
console.log("the key used to decrypt the messages is "+sw.getPrivateKey());
```

### getSymKey(id: string): Promise\<string>

Returns the symmetric key associated with the given ID

- id Default to this.options.symKeyID

```js
console.log("the sym key used to encrypt and decrypt the messages is "+sw.getSymKey());
```

### config(options: object): Promise\<void>

This function helps setup most default values that will be used by post and subscribe.

It set the TTL to 60 by default, and set powTarget and powTime in function of the info returned by web3.shh.getInfo().

- options May contain the followin values useSymKey: `boolean`, symKeyID: `string`, privateKeyID: `string`, sig: `string`, minPow: `number`, allowP2P: `boolean`, symKeyID: `string`, pubKey: `string`, sig: `string`, ttl, topic: `string`, padding: `number`, powTime: `number`, powTarget: `number`, targetPeer: `number`. Please refer to post and subscribe documentation.

Any non 4 bytes exadecimal topic string passed to config will automatically be converted to a valid topic string.

```js
sw.config(ttl: 600, topic: 'a topic');
```

### useNewKeyPair(): Promise\<number>

Generate a new key pair and set options.privateKeyID and options.sig

### useNewSymKey(): Promise\<number> 

Generate a new sym key and set options.symKeyID

### toTopic(topic: string): string

Create a topic string by converting to hex string and keeping the 10 first characters

### isTopic(topic: string): boolean

True if topic is a valid topic.

```js
sw.isTopic("1234568"); //false
sw.isTopic("0x12354678"); //true
```

## Whisper

The following properties can be accessed:

- simpleWhisper `SimpleWhisper` instance passed upon creation and used to call post and subscribe;
- subkey `number` subscription key of the subscription which generated this Whisper;
- raw `Object` raw object returned by the web3 subscription callback
- payload `any` the payload
- authorSig `string|undefined` the public key of the sender

### constructor(simpleWhisper: SimpleWhisper, message: Object, subkey: string): Whisper

Used internaly.

### postBack(payload: any, options: Object): Promise\<string>

Call this.simpleWhisper.post with pubKey set to this.authorSig by default.

```js
sw.subscribe({}, (message) => {
    message.postBack("got your message");
});
```

### subscribeBack(options: Object, cb: fn): number

Call this.simpleWhisper.subscribe with sit to this.authorSig by default.

```js
sw.subscribe({useSymKey: true}, (message) => {
    if(isTheOneILove(message))
        message.subscribeBack({}, (messageFromTheOneILove) => {
            //...
        });
});
```