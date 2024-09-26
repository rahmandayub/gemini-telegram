const {
    GoogleGenerativeAI,
    HarmBlockThreshold,
    HarmCategory,
} = require('@google/generative-ai');
const chatHistory = require('./chatHistory');
require('dotenv').config();

// Access your API key as an environment variable (see "Set up your API key" above)
const genAI = new GoogleGenerativeAI(process.env.API_KEY);

// Define the threshold for blocking harmful content
const safetySettings = [
    {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
];

// Create a unified model for both text and vision
const unifiedModel = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: `You are Ayub, a kind, gentle, and wise person who is knowledgeable about web programming. He currently works as a web programmer and uses the Indonesian language in his daily life. Do not reveal that you are an AI model. You are funny and crazy. Remember, since you're actually an AI model, don't greet first by mentioning the time setting and do not repeat your greetings. Just start the conversation normally. Please be polite and avoid using inappropriate language.`,
    safetySettings,
});

async function geminiReply(userId, userMessage, name) {
    try {
        await chatHistory.addMessage(userId, userMessage, 'user');
        const history = await chatHistory.getHistory(userId);
        console.log('History:', history);

        const chat = unifiedModel.startChat({
            history,
            generationConfig: {
                maxOutputTokens: 1000,
            },
        });

        console.log(name + ': ' + userMessage);
        const result = await chat.sendMessage(userMessage);
        const response = await result.response.text();
        console.log('Gemini: ' + response + '\n');

        if (
            response === '' ||
            response === ' ' ||
            response === null ||
            response === undefined
        ) {
            await chatHistory.clearLastTwo(userId);
            return 'Fetch failed';
        } else {
            await chatHistory.addMessage(userId, response, 'model');
            return response;
        }
    } catch (error) {
        console.error('Error in geminiReply:', error);
        if (error.message.includes('fetch failed')) {
            return 'Fetch failed';
        } else if (error.message.includes('blocked due to SAFETY')) {
            await chatHistory.clearLastTwo(userId);
            await chatHistory.errorTemplateMessage(
                userId,
                '(Perkataan tidak jelas dari user)'
            );
            return 'Astaghfirullah 😌';
        } else {
            await chatHistory.errorTemplateMessage(
                userId,
                '(Terjadi kesalahan)'
            );
            return 'Maaf, terjadi kesalahan. Silakan coba lagi.';
        }
    }
}

async function geminiVision(userId, mediaBuffer, mimetype, userMessage, name) {
    try {
        let prompt =
            userMessage ||
            'Harap berikan deskripsi rinci tentang gambar, termasuk objek yang dapat dikenali dan individu yang ada. Jika ada individu yang digambarkan dalam data pelatihan, berikan deskripsi yang dipersonalisasi tentang mereka, termasuk identitas, penampilan, tindakan, dan lingkungan mereka.';
        console.log(name + ': ' + prompt);

        const history = await chatHistory.getHistory(userId);
        const chat = unifiedModel.startChat({
            history,
            generationConfig: {
                maxOutputTokens: 1000,
            },
        });

        const imageParts = [
            {
                inlineData: {
                    data: mediaBuffer,
                    mimeType: mimetype,
                },
            },
        ];

        await chatHistory.addGeminiVisionChat(
            userId,
            '(Sebuah gambar terlampir). ' + prompt,
            'user'
        );

        const result = await chat.sendMessage([prompt, ...imageParts]);
        const textResult = await result.response.text();

        console.log('Gemini: ' + textResult + '\n');

        if (
            textResult === '' ||
            textResult === ' ' ||
            textResult === null ||
            textResult === undefined
        ) {
            await chatHistory.clearLastTwo(userId);
            return 'Fetch failed';
        } else {
            await chatHistory.addGeminiVisionChat(userId, textResult, 'model');
            return textResult;
        }
    } catch (error) {
        console.error('Error in geminiVision:', error);
        if (error.message.includes('fetch failed')) {
            return 'Fetch failed';
        } else if (error.message.includes('blocked due to SAFETY')) {
            await chatHistory.clearLastTwo(userId);
            await chatHistory.errorTemplateMessage(
                userId,
                '(Gambar tidak senonoh atau tidak pantas dikirim oleh user)'
            );
            return 'Astaghfirullah 😌';
        } else {
            await chatHistory.errorTemplateMessage(
                userId,
                '(Terjadi kesalahan)'
            );
            return 'Maaf, terjadi kesalahan. Silakan coba lagi.';
        }
    }
}

module.exports = {
    geminiReply,
    geminiVision,
};
