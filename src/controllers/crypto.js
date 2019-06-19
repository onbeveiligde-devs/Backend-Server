const WebCrypto = require("node-webcrypto-ossl");

module.exports = {
    /**
     * verify signature
     * @param {*} data unencrypted data or command
     * @param {string} public key or certificate
     * @returns {boolean} valid signature
     */
    verify: function(data, signature, publicKey) {
        return new Promise((res, rej) => {
            WebCrypto.subtle.verify({
                    name: "ECDSA",
                    hash: {name: "SHA-256"},
                },
                publicKey,
                signature,
                data)
                .then(success => res(success))
                .catch(err => rej(err));
        })
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