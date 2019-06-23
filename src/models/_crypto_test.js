const crypto = require('./crypto');

async function test() {

    let keyPair = await crypto.generateKeyPair();

    // Wrap the private key, this will generate a base64 "wrapped" version of the key
    // This base64 can be used to store in LOCAL storage (as a string)
    let wrappedPrivateKey = await crypto.wrapKey(keyPair.privateKey);
    console.log('Wrapped private key = ' + wrappedPrivateKey);

    // Wrap the public key
    let wrappedPublicKey = await crypto.wrapKey(keyPair.publicKey);
    console.log('Wrapped public key = ' + wrappedPublicKey);


    // Unwrapping private key
    // from the WRAPPED base64 LOCAL (string) version, -> to the UNWRAPPED CryptoKey (object) version
    // This can be used with SIGN
    // The unwrapKey requires you to tell if it is a PRIVATE key (true), or a PUBLIC key (false)
    let unwrappedPrivateKey = await crypto.unwrapKey(wrappedPrivateKey, true);

    // Signing with data 'The Circle', returns a base64 (string) representation
    // Signing requires our private key, because only I can sign things with my key pair
    let base64Sign = await crypto.sign('The Circle', unwrappedPrivateKey);
    console.log('Our base64 signature of "The Circle" = ' + base64Sign);

    // Verifying that a message is from that public key:
    // To verify we need the supposed original data ('The Circle')
    // We also need the sign (base64)
    // And we need the WRAPPED (base64 string) PUBLIC key from that person
    let isVerified = await crypto.verify('The Circle', base64Sign, wrappedPublicKey);
    console.log('Verifying whether the data, base64 sign and public key match');
    console.log('Verified = ' + isVerified);

}

test();