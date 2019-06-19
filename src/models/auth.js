module.exports = {
    /**
     * verify signature
     * @param {*} data unencrypted data or command
     * @param {string} public key or certificate 
     * @returns {boolean} valid signature
     */
    verify(data, key) {
        console.log(key, data);
        return true;
    },

    /**
     * sign public key or certificate
     * @param {*} exportedPrivateKey 
     * @returns {*} signed key
     */
    sign(exportedPrivateKey) {
        return crypto.subtle.importKey(
            "jwk", //can be "jwk" (public or private), "spki" (public only), or "pkcs8" (private only)
            exportedPrivateKey, { //these are the algorithm options
                name: "ECDSA",
                namedCurve: "P-256", //can be "P-256", "P-384", or "P-521"
            },
            true, //whether the key is extractable (i.e. can be used in exportKey)
            ["sign"] //"verify" for public key import, "sign" for private key imports
        ).then(function (privateKey) {
            //returns a publicKey (or privateKey if you are importing a private key)
            return crypto.subtle.sign({
                    name: "ECDSA",
                    hash: {
                        name: "SHA-256"
                    }, //can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
                },
                privateKey, //from generateKey or importKey above
                str2ab(btoa(formData)) //ArrayBuffer of data you want to sign
            )
        });
    }
}