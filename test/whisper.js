const should = require('chai').should();
const Web3 = require('web3');
const SimpleWhisper = require('../index');

describe("# Whisper", function() {
    describe("## postBack", function() {
        it("send back a message using sw1 sig", async function () {
            const payload1 = "payload1";
            const payload2 = "payload2";

            const sw1 = new SimpleWhisper(new Web3('ws://localhost:8546'));
            await Promise.all([
                sw1.config({topic: "topicPB1"}),
                sw1.useNewSymKey("topicPB1"),
                sw1.useNewKeyPair()
            ]);
            
            const sw2 = new SimpleWhisper(new Web3('ws://localhost:8546'));
            await Promise.all([
                sw2.config({topic: "topicPB1"}),
                sw2.useNewSymKey("topicPB1"),
                sw2.useNewKeyPair()
            ]);

            sw2.subscribe({useSymKey: true}, (message) => {
                payload1.should.equal(message.payload);
                message.postBack(payload2);
            });

            const done = new Promise((resolve) => {
                sw1.subscribe({}, (message) => {
                    payload2.should.equal(message.payload);
                    resolve();
                });
            });
    
            sw1.post(payload1, {useSymKey: true});
    
            return done;
        });

        it("send back a message using the symKey", async function () {
            const payload1 = "payload1";
            const payload2 = "payload2";

            const sw = new SimpleWhisper(new Web3('ws://localhost:8546'));
            await Promise.all([
                sw.config({topic: "topicPB3"}),
                sw.useNewSymKey("topicPB3")
            ]);
            

            const done = new Promise((resolve) => {
                sw.subscribe({useSymKey: true}, (message) => {
                    if(message.payload === payload2) {
                        resolve();
                    } else {
                        message.postBack(payload2, {useSymKey: true});
                    }
                });
            });
    
            sw.post(payload1, {useSymKey: true});
    
            return done;
        });

        it("throw an error is the message wasn't signed and useSymKey is falsy", async function () {
            const payload1 = "payload1";
            const payload2 = "payload2";

            const sw1 = new SimpleWhisper(new Web3('ws://localhost:8546'));
            await Promise.all([
                sw1.config({topic: "topicPB2"}),
                sw1.useNewSymKey("topicPB2")
            ]);
    
            const sw2 = new SimpleWhisper(new Web3('ws://localhost:8546'));
            await Promise.all([
                sw2.config({topic: "topicPB2"}),
                sw2.useNewSymKey("topicPB2"),
                sw2.useNewKeyPair()
            ]);
            
            const done = new Promise((resolve) => {
                sw2.subscribe({useSymKey: true}, (message) => {
                    payload1.should.equal(message.payload);
                    should.throw(() => { message.postBack(payload2) });
                    resolve();
                });
            });
    
            sw1.post(payload1, {useSymKey: true});
    
            return done;
        });
    });

    describe("## subscribeBack", function() {
        it("subscribe to the messages using sw1 sig",  async function () {
            const payload1 = "payload1";
            const payload2 = "payload2";

            const sw1 = new SimpleWhisper(new Web3('ws://localhost:8546'));
            await Promise.all([
                sw1.config({topic: "topicSB1"}),
                sw1.useNewSymKey("topicSB1"),
                sw1.useNewKeyPair()
            ]);
    
            const sw2 = new SimpleWhisper(new Web3('ws://localhost:8546'));
            await Promise.all([
                sw2.config({topic: "topicSB1"}),
                sw2.useNewSymKey("topicSB1"),
                sw2.useNewKeyPair()
            ]);

            sw1.setRemotePublicKey(await sw2.getPublicKey());

            const done = new Promise((resolve) => {
                sw2.subscribe({useSymKey: true}, (message) => {
                    payload1.should.equal(message.payload);
    
                    message.subscribeBack({}, (message) => {
                        payload2.should.equal(message.payload);

                        resolve();
                    });
    
                    sw1.post(payload2);
                });
            });
    
            sw1.post(payload1, {useSymKey: true});
    
            return done;
        });

        it("throw an error is the message wasn't signed and useSymKey is falsy", async function () {
            const payload1 = "payload1";
            const payload2 = "payload2";

            const sw1 = new SimpleWhisper(new Web3('ws://localhost:8546'));
            await Promise.all([
                sw1.config({topic: "topicSB2"}),
                sw1.useNewSymKey("topicSB2")
            ]);
    
            const sw2 = new SimpleWhisper(new Web3('ws://localhost:8546'));
            await Promise.all([
                sw2.config({topic: "topicSB2"}),
                sw2.useNewSymKey("topicSB2"),
                sw2.useNewKeyPair()
            ]);
            
            const done = new Promise((resolve) => {
                sw2.subscribe({useSymKey: true}, (message) => {
                    payload1.should.equal(message.payload);
                    should.throw(() => { message.subscribeBack({}, () => {}) });
                    resolve();
                });
            });
    
            sw1.post(payload1, {useSymKey: true});
    
            return done;
        });
    });
}); 