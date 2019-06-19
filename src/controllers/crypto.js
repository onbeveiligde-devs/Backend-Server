const WebCrypto = require("@trust/webcrypto");
const atob = require('atob');
const btoa = require('btoa');

module.exports = {
    /**
     * verify signature
     * @param {*} data unencrypted data or command
     * @param {string} public key or certificate
     * @returns {boolean} valid signature
     */
    verify: function(data, signature, publicKey) {
        return new Promise(async (res, rej) => {
            console.log(' AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAa');
            let unwrappedPublicKey = await this.unwrapKey(publicKey);
            console.log(' BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB');
            console.log(unwrappedPublicKey);
            console.log('-----');
            let unwrappedSignature = unescape(atob(signature));
            console.log(unwrappedSignature);
            WebCrypto.subtle.verify({
                    name: "ECDSA",
                    hash: {name: "SHA-256"},
                },
                unwrappedPublicKey,
                str2ab(unwrappedSignature),
                data)
                .then(success => res(success))
                .catch(err => rej(err));
        })
    },

    unwrapKey: function(key) {
        return new Promise((res, rej) => {
            WebCrypto.subtle.importKey(
                'jwk',
                JSON.parse(key),
                {   //these are the algorithm options
                    name: "ECDSA",
                    namedCurve: "P-256",
                },
                true, //whether the key is extractable (i.e. can be used in exportKey)
                ["verify", "sign"])
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
                    name: "ECDSA",
                    hash: {name: "SHA-256"}, //can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
                },
                privateKey,
                data)
                .then(signature => res(signature))
                .catch(err => rej(err));
        });
    }

};