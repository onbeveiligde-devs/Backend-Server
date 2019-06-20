function sign(data) {

    const exportedPrivateKey = localStorage.getItem("exportedPrivateKey");

    console.log("exportedPrivateKey");
    console.log(exportedPrivateKey);

    console.log("str2ab(exportedPrivateKey)");
    console.log(str2ab(exportedPrivateKey));

    return crypto.subtle.importKey(
        "pkcs8", //can be "jwk" (public or private), "spki" (public only), or "pkcs8" (private only)
        str2ab(exportedPrivateKey),
        {
            name: "RSASSA-PKCS1-v1_5",
            // Consider using a 4096-bit key for systems that require long-term security
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
        },
        true, //whether the key is extractable (i.e. can be used in exportKey)
        ["sign"] //"verify" for public key import, "sign" for private key imports
    ).then(function(privateKey){
        //returns a publicKey (or privateKey if you are importing a private key)
        return crypto.subtle.sign(
            {
                name: "RSASSA-PKCS1-v1_5",
                hash: {name: "SHA-256"}, //can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
            },
            privateKey, //from generateKey or importKey above
            str2ab("Hoi") //ArrayBuffer of data you want to sign
        )
        // str2ab(btoa(JSON.stringify(data))) //ArrayBuffer of data you want to sign

    });
}

function verify() {
}