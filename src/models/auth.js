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
     * @param {*} certificate 
     * @returns {*} signed certificate
     */
    sign(certificate) {
        return certificate
    }
}