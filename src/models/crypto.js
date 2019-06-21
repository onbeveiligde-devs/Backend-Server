const WebCrypto = require("@trust/webcrypto");
const atob = require('atob');
const btoa = require('btoa');
const Base64ArrayBufferUtil = require('base64-arraybuffer');

module.exports = {

    verify: async function(data, sign, publicKeyBase64) { // data should be a string, sign should be a base64sign

        let publicKey = atob(publicKeyBase64);
        return new Promise(async (res, rej) => {
            let pub = await this.unwrapKey(publicKey, false);

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
                JSON.parse(key),
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
                .then(res)
                .catch(rej);
        });
    },

    sign: function(data, privateKey) {
        return new Promise((res, rej) => {
            WebCrypto.subtle.sign({
                    name: "RSASSA-PKCS1-v1_5"
                },
                privateKey,
                data)
                .then(signature => res(signature))
                .catch(err => rej(err));
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