function sign(data) { // data should be a string
    return new Promise((res, rej) => {
        const jwkPrivateKey = JSON.parse(atob(localStorage.getItem(("exportedPrivateKey"))));

        crypto.subtle.importKey(
            'jwk',
            jwkPrivateKey,
            {
                name: "RSASSA-PKCS1-v1_5",
                hash: {name: "SHA-256"},
            },
            true,
            ["sign"]
        ).then((privateKey) => {
            return crypto.subtle.sign({
                    name: "RSASSA-PKCS1-v1_5"
                },
                privateKey,
                str2ab(data)
            )
        })
            .then(signature => res(signature))
            .catch(err => rej(err));
    });
}