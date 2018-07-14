let subkeyCounter = 0;

/**
 * Web3 Whisper made simple
 */
class SimpleWhisper {
    /**
     * @param {Object} web3 an instance of Web3 version 1.0 
     */
    constructor(web3) {
        this.web3 = web3;
        this.subscriptions = new Map();
        this.options = {};
    }

    /**
     * Post a whisper
     * 
     * @param {*} payload optional payload serializable with JSON.stringify
     * @param {Object} options see web3.shh.post docs
     * @param {boolean} useSymKey optional, if true set undefined the pubKey else set undefined the symKeyID. Default to !this.options.pubKey.
     * @return {Promise<string>} the hash of the message
     */
    post(payload, options = {}) {
        const mergedOptions = Object.assign({}, {
            symKeyID: options.useSymKey ? this.options.symKeyID : undefined,
            pubKey: options.useSymKey ? undefined : this.options.pubKey,
            sig: this.options.sig,
            ttl: this.options.ttl,
            topic: this.options.topic,
            payload: this.web3.utils.toHex(JSON.stringify(payload)),
            padding: this.options.padding,
            powTime: this.options.powTime,
            powTarget: this.options.powTarget,
            targetPeer: this.options.targetPeer
        }, options);
        
        return this.web3.shh.post(mergedOptions);
    }

    /**
     * @callback subscribeCallback
     * @param {Whisper} message A message received
     */

    /**
     * Subscribe to whispers
     * 
     * @param {Object} see web3.shh.subscribe docs
     * @param {subscribeCallback} cb
     * @return {number} a subsciption id
     */
    subscribe(options, cb) {
        const subkey = subkeyCounter++;
        this.subscriptions.set(subkey, cb);

        this.web3.shh.subscribe('messages', Object.assign({}, {
                symKeyID: options.useSymKey ? this.options.symKeyID : undefined,
                privateKeyID: options.useSymKey ? undefined : this.options.privateKeyID,
                sig: this.options.pubKey,
                topics: [this.options.topic],
                minPow: this.options.minPow,
                allowP2P: this.options.allowP2P
            }, options))
            .on('data', (message) => {
                if (this.subscriptions.has(subkey)) {
                    this.subscriptions.get(subkey)(new Whisper(this, message, subkey));
                }
            });

        return subkey;
    }

    /**
     * Stop a subscription
     * 
     * @param {number} subkey a subscription id
     * @returns {boolean} true is the subsciption was successfully removed
     */
    unsubscribe(subkey) {
        return this.subscriptions.delete(subkey);
    }

    /**
     * Returns the public key for a key pair ID
     * 
     * @param {*} id Default to this.options.sig
     * @returns {Promise<string>}
     */
    getPublicKey(id = this.options.sig) {
        return this.web3.shh.getPublicKey(id);
    }

    /**
     * Set this.options.pubKey which is used as default pubKey for sending messages
     */
    setRemotePublicKey(pubKey) {
        this.options.pubKey = pubKey;
    }

    /**
     * Returns the private key for a key pair ID
     * 
     * @param {*} id  Default to this.options.privateKeyID
     * @returns {Promise<string>}
     */
    getPrivateKey(id = this.options.privateKeyID) {
        return this.web3.shh.getPrivateKey(id);
    }

    /**
     * Returns the symmetric key associated with the given ID
     * 
     * @param {*} id Default to this.options.symKeyID
     * @returns {Promise<string>}
     */
    getSymKey(id = this.options.symKeyID) {
        return this.web3.shh.getSymKey(id);
    }

    /**
     * Set the default values and call getInfo
     * 
     * Possible keys: sig: Number, symKeyID: Number, pubKey: String, payload: any, padding: Number, targetPeer: Number, minPow: Number, allowP2P: Bool, ttl: Number, powTime: Number, powTarget: Number, topic: String|Number|BN|BigNumber
     * 
     * powTarget is set by default to 2 * minPow
     * 
     * @param {Object} options object containing all default values
     * @return {Promise<void>}
     */
    async config(options = {}) {
        // fetch info
        this.info = await this.web3.shh.getInfo();

        this.options = Object.assign(
            this.options,
            SimpleWhisper.DEFAULT_OPTIONS, 
            {
                powTarget: 2 * this.info.minPow,
                powTime: Math.ceil(2 * this.info.minPow)
            },
            options);

        // topic
        if(!this.isTopic(this.options.topic)) {
            this.options.topic = this.toTopic(this.options.topic);
        }
    }

    /**
     * Generate a new key pair and set options.privateKeyID and options.sig
     * 
     * @return {Promise<Number>}
     */
    async useNewKeyPair() {
        this.options.privateKeyID = await this.web3.shh.newKeyPair();
        this.options.sig = this.options.privateKeyID;

        return this.options.privateKeyID;
    }

    /**
     * Generate a new sym key and set options.symKeyID
     * 
     * @param {string} password if provided generate a sym key from the password
     * @return {Promise<Number>}
     */
    async useNewSymKey(password = null) {
        return this.options.symKeyID = await (password ? 
            this.web3.shh.generateSymKeyFromPassword(password) : this.web3.shh.newSymKey());
    }

    /**
     * Create a topic string by converting to hex string and keeping the 10 first characters
     * 
     * @param {String|Number|BN|BigNumber} topic 
     * @returns {string} topic
     */
    toTopic(topic) {
        return (this.web3.utils.toHex(topic) + "00000000").substring(0, 10);
    }

    /**
     * @param {*} topic
     * @return {boolean} topic 
     */
    isTopic(topic) {
        return !!(Object.prototype.toString.call(topic) === "[object String]" 
            && topic.match(/^0x[0-9a-fA-F]{8}$/));
    }
}

SimpleWhisper.DEFAULT_OPTIONS = {
    ttl: 60
};

/**
 * Subscribtion message abstraction
 */
class Whisper {
    /**
     * @param {SimpleWhisper} simpleWhisper 
     * @param {Object} message
     * @param {number} subkey
     */
    constructor(simpleWhisper, message, subkey) {
        this.simpleWhisper = simpleWhisper;
        this.subkey = subkey;
        this.raw = message;
        this.payload = JSON.parse(simpleWhisper.web3.utils.hexToString(message.payload));
        this.authorSig = message.sig;
    }

    /**
     * Post a whisper with pubKey matching the message sig
     * 
     * @param {*} payload optional payload serializable with JSON.stringify
     * @param {Object} options see web3.shh.post docs
     * @return {Promise<hash>} the hash of the message
     */
    postBack(payload, options = {}) {
        if(!options.useSymKey && !this.authorSig && !this.simpleWhisper.options.pubKey && !options.pubKey) {
            throw new Error("The message you received isn't signed, you must specify the recipient pubKey or a symKeyID and useSymKey.");
        }

        const mergedOptions = Object.assign({pubKey: this.authorSig}, options);

        return this.simpleWhisper.post(payload, mergedOptions);
    }

    /**
     * Subscribe to whispers
     * 
     * @param {Object} see web3.shh.subscribe docs
     * @param {subscribeCallback} cb
     * @return {number} a subsciption id
     */
    subscribeBack(options, cb) {
        if(!options.useSymKey && !this.authorSig && !this.simpleWhisper.options.pubKey && !options.sig) {
            throw new Error("The message you received isn't signed, you must specify the recipient pubKey or a symKeyID and useSymKey.");
        }

        const mergedOptions = Object.assign({sig: this.authorSig}, options);
        
        return this.simpleWhisper.subscribe(mergedOptions, cb);
    }
}

module.exports = SimpleWhisper;