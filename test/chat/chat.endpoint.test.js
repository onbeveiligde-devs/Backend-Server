const assert = require('assert');
const request = require('supertest');
const {
    app
} = require('../../app');
const Chat = require('../../src/models/db/Chat');

describe('Chat endpoint test', () => {

    it.only('Get request returns list of chat messages', (done) => {
        request(app)
            .get('/chat')
            .expect(200)
            .end((err, res) => {
                console.log(res.body)
                assert(Array.isArray(res.body.messages))
                done();
            })
    })
})