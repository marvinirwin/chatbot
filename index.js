const axios = require('axios');
const fs = require('fs');

const BASE_URL = "https://us-central1-rival-chatbot-challenge.cloudfunctions.net";
const MAX_CHAT_LENGTH = 100;

const teamData = fs.readFileSync('./sports-teams.dat')
    .toString()
    .split('\n')
    .slice(1)
    .map(line => {
        const [teamName, city, league, year, sport] = line.split(',').map(str => str.trim());
        return {teamName, city, league, year, sport}
    })

const register = () => {
    return axios.post(`${BASE_URL}/challenge-register`, {name: "John Doe", "email": "jane@doe.com"})
        .then(response => response.data.user_id)
}

const startConversation = (userId) => {
    return axios.post(`${BASE_URL}/challenge-conversation`, {user_id: userId})
        .then(response => response.data.conversation_id)
}

const nextChallengeStep = (conversationId) => {
    return axios.get(`${BASE_URL}/challenge-behaviour/${conversationId}`)
        .then(response => response.data.messages[response.data.messages.length - 1])
}

const respond = (conversationid, response) => {
    return axios.post(`${BASE_URL}/challenge-behaviour/${conversationid}`, {content: response})
        .then(response => response.data.correct)
}

const handleChallengeMessage = ({text}) => {
    if (text === `Are you ready to begin?`) {
        return "yes";
    }
    if (text === `Great! Are you ready to continue to some word questions?`) {
        return "yes";
    }
    if (text === 'Are you ready to go?') {
        return "yes";
    }
    if (isSumQuestion(text)) {
        return sumResponse(text);
    }
    if (isMaxQuestion(text)) {
        return maxResponse(text);
    }
    if (isEvenLengthWords(text)) {
        return evenLengthWordsResponse(text)
    }
    if (isAlphabetizeWords(text)) {
        return alphabetizeResponse(text)
    }
    if (isNhl(text)) {
        return isNhlResponse(text);
    }
    if (isBaseBall(text)) {
        return isBaseballResponse(text);
    }
    if (isSportsTeamsEstablishedDate(text)) {
        return isSportsTeamsEstablishedDateResponse(text)
    }
}



const filterTeams = (regexp, filterFunc) => text => {
    const [_, teams] = text.match(regexp);
    return teams
        .split(',')
        .map(team => team.trim())
        .filter(filterFunc)
        .join(',');
}

const isSportsTeamEstablishedDateRegexp = /What sports teams in the data set were established in (\d+)\?$/
const isSportsTeamsEstablishedDate = text => text.match(isSportsTeamEstablishedDateRegexp);
const isSportsTeamsEstablishedDateResponse = text => {
    const [_, yearEstablished] = text.match(isSportsTeamEstablishedDateRegexp);
    return teamData
        .filter(({year}) => yearEstablished === year)
        .map(({teamName}) => teamName)
        .join(',')
}


const isNhlRegexp = /^Which of the following is an NHL team: (.*)\?$/;
const isNhl = text => !!text.match(isNhlRegexp);
const isNhlResponse = filterTeams(isNhlRegexp, team => teamData
    .find(({teamName, league}) =>
        teamName === team && league === 'NHL'
    ));

const isBaseballRegexp = /^Which of the following is a baseball team: (.*)\?$/;
const isBaseBall = text => !!text.match(isBaseballRegexp);
const isBaseballResponse = filterTeams(isBaseballRegexp, team => teamData
    .find(({teamName, sport}) =>
        teamName === team && sport === 'baseball'
    ));

const sumRegexp = /^What is the sum of the following numbers: (.*)\?$/;

/**
 * @param text {string}
 * @returns boolean
 */
const isSumQuestion = (text) => {
    return !!text.match(sumRegexp)
}

/**
 * @param text {string}
 */
const sumResponse = (text) => {
    const [, numbers] = text.match(sumRegexp);
    return `${
        numbers
            .split(',')
            .map(n => parseFloat(n.trim()))
            .reduce((sum, num) => sum + num, 0)
    }`;
}


const maxRegexp = /^What is the largest of the following numbers: (.*)\?$/;
const isMaxQuestion = (text) => {
    return !!text.match(maxRegexp);
}

const maxResponse = (text) => {
    const [, numbers] = text.match(maxRegexp);
    return `${Math.max(...numbers.split(',').map(n => parseFloat(n.trim())))}`;
}

const evenLengthRegexp = /^Please repeat only the words with an even number of letters: (.*)\.$/;
const isEvenLengthWords = text => !!text.match(evenLengthRegexp)
const evenLengthWordsResponse = text => {
    const [, words] = text.match(evenLengthRegexp);
    return words.split(',')
        .map(word => word.trim())
        .filter(word => word.length % 2 === 0)
        .join(',')
}

const alphabetizeRegexp = /^Please alphabetize the following words: (.*)\.$/;
const alphabetizeResponse = text => {
    const [, words] = text.match(alphabetizeRegexp);
    return words.split(',')
        .map(word => word.trim())
        .map(word => ({word, lower: word.toLowerCase()}))
        .sort(({lower: a}, {lower: b}) => {
            if (a > b) return 1;
            if (a < b) return -1;
            return 0;
        })
        .map(({word}) => word)
        .join(',')
}
const isAlphabetizeWords = text => !!text.match(alphabetizeRegexp)

const completeChallenge = async () => {
    const userId = await register();
    const conversationId = await startConversation(userId);
    for (let i = 0; i < MAX_CHAT_LENGTH; i++) {
        const nextStep = await nextChallengeStep(conversationId);
        console.log(nextStep);
        if (challengeFinished(nextStep.text)) {
            return 0;
        }
        const response = await handleChallengeMessage(nextStep);
        const isCorrect = await respond(conversationId, response);
        if (!isCorrect) {
            throw new Error(`Answered ${nextStep} wrong with ${response}`);
        }
    }
    throw new Error(`Chat has gone over the configured amount of messages ${MAX_CHAT_LENGTH}`);
}

const challengeFinished = text => text === 'Thank you for taking the Rival Chatbot Challenge';

if (require.main === module) {
    completeChallenge()
}


module.exports = {
    completeChallenge
}
