const WebCrypto = require("@trust/webcrypto");
const atob = require('atob');
const btoa = require('btoa');
const Base64ArrayBufferUtil = require('base64-arraybuffer');

module.exports = {

    verify: async function(data, sign, publicKeyBase64) {
        let publicKey = atob(publicKeyBase64);
        return new Promise(async (res, rej) => {
            console.log(data);
            console.log(sign);
            console.log(publicKey);

            let pub = await this.unwrapKey(publicKey, false);

            WebCrypto.subtle.verify(
                {
                    name: "RSASSA-PKCS1-v1_5",
                    hash: {name: "SHA-256"}, //can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
                },
                pub, //from generateKey or importKey above
                Base64ArrayBufferUtil.decode(sign), //ArrayBuffer of the signature
                this.str2ab(data) //ArrayBuffer of the data
            )
                .then(succ => {
                    console.log(succ);
                    res(succ);
                })
                .catch(err => {
                    console.error(err);
                    rej(err);
                });
            console.log('b');
        });
    },

    unwrapKey: function(key, isPrivate) {
        return new Promise((res, rej) => {
            WebCrypto.subtle.importKey(
                'jwk',
                JSON.parse(key),
                {   //these are the algorithm options
                    name: "RSASSA-PKCS1-v1_5",
                    hash: {name: "SHA-256"}, //can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
                },
                true, //whether the key is extractable (i.e. can be used in exportKey)
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
        var buf = new ArrayBuffer(str.length * 2); // 2 bytes for each char
        var bufView = new Uint16Array(buf);
        for (var i = 0, strLen = str.length; i < strLen; i++) {
            bufView[i] = str.charCodeAt(i);
        }
        return buf;
    }

};