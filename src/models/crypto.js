const WebCrypto = require("@trust/webcrypto"); // BROWSER VERSION -> const WebCrypto = window.crypto.subtle;
const atob = require('atob'); // Remove if on browser
const btoa = require('btoa'); // Remove if on browser


const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
let lookup = new Uint8Array(256);

for (let i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
}

module.exports = {
    verify: function(data, sign, publicKeyWrappedBase64) { // data should be a string, sign should be a base64sign (string)
        return new Promise(async (res, rej) => {
            let pub = await this.unwrapKey(publicKeyWrappedBase64, false);

            WebCrypto.subtle.verify(
                {
                    name: "RSASSA-PKCS1-v1_5",
                    hash: {name: "SHA-256"},
                },
                pub,
                this.b642ab(sign),
                this.str2ab(data)
            )
                .then(succ => {
                    res(succ);
                })
                .catch(err => {
                    console.error(err);
                    rej(err => rej(err));
                });
        });
    },

    unwrapKey: function(key, isPrivate) {
        return new Promise((res, rej) => {
            WebCrypto.subtle.importKey(
                'jwk',
                JSON.parse(atob(key)),
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
                .then(jwk => res(btoa(JSON.stringify(jwk))))
                .catch(err => rej(err));
        });
    },

    // Data must be a string, privateKey must be a CryptoKey (UNWRAPPED, in object form)
    sign: function(data, privateKeyCryptoKey) {
        return new Promise((res, rej) => {
            WebCrypto.subtle.sign(
                {
                    name: "RSASSA-PKCS1-v1_5",
                    hash: {name: "SHA-256"},
                },
                privateKeyCryptoKey,
                this.str2ab(data)
            )
                .then(signature => {
                    res(this.ab2b64(signature));
                })
                .catch(err => rej(err));
        });
    },

    // Generates an object as follows:
    // {
    //      privateKey, (CryptoKey, so it is UNWRAPPED!!!)
    //      publicKey   (CryptoKey, so it is UNWRAPPED!!!)
    // }
    generateKeyPair: function() {
        return new Promise((res, rej) => {
            WebCrypto.subtle.generateKey(
                {
                    name: "RSASSA-PKCS1-v1_5",
                    modulusLength: 2048, //can be 1024, 2048, or 4096
                    publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
                    hash: {name: "SHA-256"}, //can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
                },
                true, //whether the key is extractable (i.e. can be used in exportKey)
                ["sign", "verify"]) //can be any combination of "sign" and "verify")
                .then(keyPair => res(keyPair))
                .catch(err => rej(err))
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
    },

    // ArrayBuffer to Base64 string
    ab2b64(arraybuffer) {
        let bytes = new Uint8Array(arraybuffer),
            i, len = bytes.length, base64 = "";

        for (i = 0; i < len; i+=3) {
            base64 += chars[bytes[i] >> 2];
            base64 += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
            base64 += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
            base64 += chars[bytes[i + 2] & 63];
        }

        if ((len % 3) === 2) {
            base64 = base64.substring(0, base64.length - 1) + "=";
        } else if (len % 3 === 1) {
            base64 = base64.substring(0, base64.length - 2) + "==";
        }

        return base64;
    },

    // Base64 string to ArrayBuffer
    b642ab(base64) {
        let bufferLength = base64.length * 0.75,
            len = base64.length, i, p = 0,
            encoded1, encoded2, encoded3, encoded4;

        if (base64[base64.length - 1] === "=") {
            bufferLength--;
            if (base64[base64.length - 2] === "=") {
                bufferLength--;
            }
        }

        let arraybuffer = new ArrayBuffer(bufferLength),
            bytes = new Uint8Array(arraybuffer);

        for (i = 0; i < len; i+=4) {
            encoded1 = lookup[base64.charCodeAt(i)];
            encoded2 = lookup[base64.charCodeAt(i+1)];
            encoded3 = lookup[base64.charCodeAt(i+2)];
            encoded4 = lookup[base64.charCodeAt(i+3)];

            bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
            bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
            bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
        }

        return arraybuffer;
    }

};