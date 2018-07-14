const should = require('chai').should();
const Web3 = require('web3');
const SimpleWhisper = require('../index');
const delay = (t) => new Promise((r) => setTimeout(r, t));

describe("# SimpleWhisper", function() {
    it("A local web3 provider is available at ws://localhost:8546", function() {
        const web3 = new Web3('ws://localhost:8546');
        return web3.shh.getInfo();
    });

    describe("## useNewKeyPair", function() {
        it("create a new key pair", async function() {
            const sw = new SimpleWhisper(new Web3('ws://localhost:8546'));
            await sw.useNewKeyPair();

            should.exist(sw.options.privateKeyID);
            sw.options.privateKeyID.should.equal(sw.options.sig);
        });
    });

    describe("## useNewSymKey", function() {
        it("create a new sym key", async function() {
            const sw = new SimpleWhisper(new Web3('ws://localhost:8546'));
            await sw.useNewSymKey();

            should.exist(sw.options.symKeyID);
        });
    });

    describe("## config", function() {
        it("Fetch the node's infos and set powTarget & powTime", async function () {
            const sw = new SimpleWhisper(new Web3('ws://localhost:8546'));
            await sw.config();

            should.exist(sw.info);
            should.exist(sw.options.powTarget);
            sw.options.powTarget.should.be.above(0);
            should.exist(sw.options.powTime);
            sw.options.powTime.should.be.a.above(0);
        });

        it("When passed an arbitrary string as a topic it should be converted using to topic", async function() {
            const sw = new SimpleWhisper(new Web3('ws://localhost:8546'));
            await sw.config({topic: "sometopic"});

            should.exist(sw.options.topic);
            sw.isTopic(sw.options.topic).should.be.true;
        });

        it("When passed a topic it should not be altered", async function() {
            const topic = "0x12345678";

            const sw = new SimpleWhisper(new Web3('ws://localhost:8546'));
            await sw.config({topic});

            topic.should.equal(sw.options.topic);
        });
    });

    describe("## subscribe", function() {
        it("The subkey match the subsciption in simpleWhisper.subscriptions", async function() {
            const sw = new SimpleWhisper(new Web3('ws://localhost:8546'));
            await Promise.all([
                sw.config({topic: "topicA"}),
                sw.useNewKeyPair()
            ]);

            return new Promise(async (resolve) => {
                let subkey = null;
                
                const handler = (message) => {
                    subkey.should.equal(message.subkey);
                    sw.subscriptions.has(subkey).should.be.true;
                    sw.subscriptions.get(subkey).should.equal(handler);

                    resolve();
                };
                
                subkey = sw.subscribe({}, handler);
                sw.post("payload", {pubKey: await sw.getPublicKey()});
            });
        });
    });

    describe("## unsubscibe", function() {
        it("remove the entry in simpleWhisper.subscriptions", async function() {
            const sw = new SimpleWhisper(new Web3('ws://localhost:8546'));
            await Promise.all([
                sw.config({topic: "topicA"}),
                sw.useNewKeyPair()
            ]);
                
            const subkey = sw.subscribe({}, () => {});

            sw.unsubscribe(subkey).should.be.true;
            sw.subscriptions.has(subkey).should.be.false;
        });

        it("does not receive message after unsubsciption", async function() {
            const sw = new SimpleWhisper(new Web3('ws://localhost:8546'));
            await Promise.all([
                sw.config({topic: "topicA"}),
                sw.useNewKeyPair()
            ]);
                
            const subkey = sw.subscribe({}, () => {
                throw "this should not be called";
            });

            sw.unsubscribe(subkey);
            
            sw.post("payload", {pubKey: await sw.getPublicKey()});

            await delay(1000);
        });
    });

    describe("## post", function() {
        it("should use the symKey when useSymKey is truly and symKeyID is set", async function(){
            const payload = "payload";
            const sw = new SimpleWhisper(new Web3('ws://localhost:8546'));
            await Promise.all([
                sw.config({topic: "topicB"}),
                sw.useNewKeyPair(),
                sw.useNewSymKey()
            ]);

            return new Promise((resolve) => {
                const handler = (message) => {
                    payload.should.equal(message.payload);

                    resolve();
                };
                
                sw.subscribe({useSymKey: true}, handler);
                sw.post(payload, {useSymKey: true});
            });
        });

        it("should use the keyPair when symKey is falsy and pubKey is set", async function() {
            const payload = "payload";
            const sw = new SimpleWhisper(new Web3('ws://localhost:8546'));
            await Promise.all([
                sw.config({topic: "topicC"}),
                sw.useNewKeyPair(),
                sw.useNewSymKey()
            ]);
            sw.setRemotePublicKey(await sw.getPublicKey());

            return new Promise(async (resolve) => {
                const handler = (message) => {
                    payload.should.equal(message.payload);

                    resolve();
                };

                sw.subscribe({}, handler);
                sw.post(payload);
            });
        });
    });

    describe("## getPublicKey", function() {
        it("return the current publicKey by default", async function() {
            const web3 = new Web3('ws://localhost:8546');
            const sw = new SimpleWhisper(web3);
            const keyId = await sw.useNewKeyPair();

            (await web3.shh.getPublicKey(keyId)).should.equal(await sw.getPublicKey());
            keyId.should.equal(sw.options.sig);
            keyId.should.equal(sw.options.privateKeyID);
        });

        it("return the publicKey for the keyID provided", async function() {
            const web3 = new Web3('ws://localhost:8546');
            const sw = new SimpleWhisper(web3);
            const keyId = await web3.shh.newKeyPair();

            (await web3.shh.getPublicKey(keyId)).should.equal(await sw.getPublicKey(keyId));
        });
    });

    describe("## setRemotePublicKey", function() {
        it("set options.pubKey", function() {
            const pubKey = "SOMEPUBKEY";
            const sw = new SimpleWhisper(new Web3('ws://localhost:8546'));
            sw.setRemotePublicKey(pubKey);
            pubKey.should.equal(sw.options.pubKey);
        });
    });

    describe("## getPrivateKey", function() {
        it("return the current private key by default", async function() {
            const web3 = new Web3('ws://localhost:8546');
            const sw = new SimpleWhisper(web3);
            const keyId = await sw.useNewKeyPair();

            (await web3.shh.getPrivateKey(keyId)).should.equal(await sw.getPrivateKey());
            keyId.should.equal(sw.options.sig);
            keyId.should.equal(sw.options.privateKeyID);
        });

        it("return the private key for the keyID provided", async function() {
            const web3 = new Web3('ws://localhost:8546');
            const sw = new SimpleWhisper(web3);
            const keyId = await web3.shh.newKeyPair();

            (await web3.shh.getPrivateKey(keyId)).should.equal(await sw.getPrivateKey(keyId));
        });
    });

    describe("## getSymKey", function() {
        it("return the current symetric key by default", async function() {
            const web3 = new Web3('ws://localhost:8546');
            const sw = new SimpleWhisper(web3);
            const keyId = await sw.useNewSymKey();
            
            (await web3.shh.getSymKey(keyId)).should.equal(await sw.getSymKey());
            keyId.should.equal(sw.options.symKeyID);
        });

        it("return the symetric key for the keyID provided", async function() {
            const web3 = new Web3('ws://localhost:8546');
            const sw = new SimpleWhisper(web3);
            const keyId = await web3.shh.newSymKey();

            (await web3.shh.getSymKey(keyId)).should.equal(await sw.getSymKey(keyId));
        });

        it("symetric key created with the same password does match", async function() {
            const sw1 = new SimpleWhisper(new Web3('ws://localhost:8546'));
            const sw2 = new SimpleWhisper(new Web3('ws://localhost:8546'));
            await sw1.useNewSymKey("some password !");
            await sw2.useNewSymKey("some password !");

            (await sw1.getSymKey()).should.equal(await sw2.getSymKey());
        })
    });

    describe("## isTopic", function() {
        it("return true when a topic is provided", function() {
            const sw = new SimpleWhisper(new Web3('ws://localhost:8546'));

            sw.isTopic("0x12345678").should.be.true;
            sw.isTopic("0xabcdefab").should.be.true;
            sw.isTopic("0xABCDEFAB").should.be.true;
            sw.isTopic("0x1Aa2Bb3C").should.be.true;
        });

        it("return false when the parameter is not a 10 character long exa string", function() {
            const sw = new SimpleWhisper(new Web3('ws://localhost:8546'));

            sw.isTopic("0x123456789").should.be.false;
            sw.isTopic("0x1234567").should.be.false;
            sw.isTopic("0xabcdefag").should.be.false;
            sw.isTopic("0xABCDEFAG").should.be.false;
            sw.isTopic("12345678").should.be.false;
            sw.isTopic("x123456789").should.be.false;
            sw.isTopic("0123456789").should.be.false;
            sw.isTopic({}).should.be.false;
            sw.isTopic([]).should.be.false;
            sw.isTopic(null).should.be.false;
            sw.isTopic(undefined).should.be.false;
            sw.isTopic(123456789).should.be.false;
        });
    });

    describe("## toTopic", function() {
        it("it create a topic from an arbitrary string", function() {
            const sw = new SimpleWhisper(new Web3('ws://localhost:8546'));

            sw.isTopic(sw.toTopic("arbitrary string")).should.be.true;
            sw.isTopic(sw.toTopic("short")).should.be.true;
        });

        it("it create a topic from an arbitrary number", function() {
            const sw = new SimpleWhisper(new Web3('ws://localhost:8546'));

            sw.isTopic(sw.toTopic(1234567890)).should.be.true;
            sw.isTopic(sw.toTopic(12345)).should.be.true;
        });
    });
}); 