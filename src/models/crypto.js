const WebCrypto = require("@trust/webcrypto");
const atob = require('atob');
const btoa = require('btoa');
const Base64ArrayBufferUtil = require('base64-arraybuffer');

module.exports = {
    
    verify: async function(data, sign, publicKeyBase64) { // data should be a string, sign should be a base64sign (string)
        return new Promise(async (res, rej) => {
            let pub = await this.unwrapKey(publicKeyBase64, false);

            WebCrypto.subtle.verify(
                {
                    name: "RSASSA-PKCS1-v1_5",
                    hash: {name: "SHA-256"},
                },
                pub,
                Base64ArrayBufferUtil.decode(sign),
                this.str2ab(data)
            )
                .then(succ => {
                    res(succ);
                })
                .catch(err => {
                    console.error(err);
                    rej(err);
                });
        });
    },

    unwrapKey: function(key, isPrivate) {
        return new Promise((res, rej) => {
            WebCrypto.subtle.importKey(
                'jwk',
                atob(JSON.parse(key)),
                {
                    name: "RSASSA-PKCS1-v1_5",
                    hash: {name: "SHA-256"},
                },
                true,
                [(isPrivate ? "sign" : "verify")])
                .then(unwrappedKey => res(unwrappedKey))
                .catch(err => rej(err));
        });
    },
    wrapKey: function(key) {
        return new Promise((res, rej) => {
            WebCrypto.subtle.exportKey(
                'jwk',
                key)
                .then(jwk => btoa(JSON.stringify(jwk)))
                .catch(rej);
        });
    },

    // Data must be a string, privateKey must be a CryptoKey (UNWRAPPED)
    sign: function(data, privateKey) {
        return new Promise((res, rej) => {
            WebCrypto.subtle.sign({
                    name: "RSASSA-PKCS1-v1_5"
                },
                privateKey,
                str2ab(data))
                .then(signature => res(signature))
                .catch(err => rej(err));
        });
    },

    // Generates an object as follows:
    // {
    //      privateKey, (CryptoKey, so it is UNWRAPPED!!!)
    //      publicKey   (CryptoKey, so it is UNWRAPPED!!!)
    // }
    generateKeyPair: function() {
        return new Promise<CryptoKeyPair>((res, rej) => {
            window.crypto.subtle.generateKey(
                {
                    name: "RSASSA-PKCS1-v1_5",
                    modulusLength: 2048, //can be 1024, 2048, or 4096
                    publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
                    hash: {name: "SHA-256"}, //can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
                },
                true, //whether the key is extractable (i.e. can be used in exportKey)
                ["sign", "verify"]) //can be any combination of "sign" and "verify")
                .then(keyPair => res(keyPair))
                .catch(console.error)
        });
    },

    ab2str: function(buf) {
        return String.fromCharCode.apply(null, new Uint16Array(buf));
    },

    str2ab: function(str) {
        let buf = new ArrayBuffer(str.length * 2); // 2 bytes for each char
        let bufView = new Uint16Array(buf);
        for (i = 0, strLen = str.length; i < strLen; i++) {
            bufView[i] = str.charCodeAt(i);
        }
        return buf;
    }

};