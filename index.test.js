const axios = require('axios');
const {completeChallenge} = require('./index');


jest.setTimeout(30000);

describe('The Chatbot', () => {
    it('Completes the challenge', async () => {
        expect(await completeChallenge()).toBe(0);
    })
})