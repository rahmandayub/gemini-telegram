const { Bot } = require('grammy');
require('dotenv').config();
const chatHistory = require('./chatHistory');
const gemini = require('./gemini');
const axios = require('axios');

// Create an instance of the `Bot` class and pass your bot token to it.
const bot = new Bot(process.env.TOKEN);

// Handle the /start command.
bot.command('start', (ctx) =>
    ctx.reply('Welcome! Send me a message to get started.')
);
// Handle other messages.
bot.on('message:audio', (ctx) =>
    ctx.reply("Sorry, I don't understand audio messages.")
);
bot.on('message:video', (ctx) =>
    ctx.reply("Sorry, I don't understand video messages.")
);
bot.on('message:document', (ctx) =>
    ctx.reply("Sorry, I don't understand document messages.")
);

bot.on('message:voice', (ctx) =>
    ctx.reply("Sorry, I don't understand voice messages.")
);

bot.on('message:sticker', (ctx) =>
    ctx.reply("Sorry, I don't understand sticker messages.")
);

bot.on('message:location', (ctx) =>
    ctx.reply("Sorry, I don't understand location messages.")
);

bot.on('message:contact', (ctx) =>
    ctx.reply("Sorry, I don't understand contact messages.")
);

bot.on('message:game', (ctx) =>
    ctx.reply("Sorry, I don't understand game messages.")
);

bot.on('message:invoice', (ctx) =>
    ctx.reply("Sorry, I don't understand invoice messages.")
);

bot.on('message:text', async (ctx) => {
    try {
        // function generate text from text
        async function generateTextFromText() {
            let response = await gemini.geminiReply(
                userId,
                userMessage,
                fullname
            );

            while (response === 'Fetch failed') {
                response = await gemini.geminiReply(
                    userId,
                    userMessage,
                    fullname
                );
            }
            if (response !== 'Fetch failed') {
                const maxLength = 4096;
                const chunks = response.match(
                    new RegExp(`.{1,${maxLength}}`, 'g')
                );

                for (const chunk of chunks) {
                    await ctx.reply(chunk);
                }
            }
        }

        const userId = ctx.from.id;
        const fullname = ctx.from.first_name + ' ' + ctx.from.last_name;
        const userMessage = ctx.message.text;
        const isClear = userMessage.toLowerCase() === 'clear';

        if (isClear) {
            await chatHistory.clearHistory(userId);
            await ctx.reply('Chat history cleared.');
        } else {
            await generateTextFromText();
        }
    } catch (error) {
        console.log('Error: ', error);
    }
});

bot.on('message:photo', async (ctx) => {
    try {
        // Function to determine the mimetype based on the file extension
        function getMimetypeFromExtension(path) {
            const extension = path.split('.').pop();
            switch (extension) {
                case 'jpg':
                case 'jpeg':
                    return 'image/jpeg';
                case 'png':
                    return 'image/png';
                case 'gif':
                    return 'image/gif';
                // Add more cases for other file extensions if needed
                default:
                    return 'application/octet-stream';
            }
        }

        // function generate text from text and image
        async function generateTextFromImage() {
            const userId = ctx.from.id;
            const fullname = ctx.from.first_name + ' ' + ctx.from.last_name;
            const userMessage = ctx.message.caption;

            let textResult = await gemini.geminiVision(
                userId,
                mediaBuffer,
                mimetype,
                userMessage,
                fullname
            );

            while (textResult === 'Fetch failed') {
                textResult = await gemini.geminiVision(
                    userId,
                    mediaBuffer,
                    mimetype,
                    userMessage,
                    fullname
                );
            }
            if (textResult !== 'Fetch failed') {
                const maxLength = 4096;
                const chunks = textResult.match(
                    new RegExp(`.{1,${maxLength}}`, 'g')
                );

                for (const chunk of chunks) {
                    await ctx.reply(chunk);
                }
            }
        }

        const file = await ctx.getFile(); // valid for at least 1 hour
        const path = file.file_path; // file path on Bot API server
        const onlinePath =
            'https://api.telegram.org/file/bot' +
            process.env.TOKEN +
            '/' +
            path;
        console.log('File path: ', onlinePath);

        // Make an HTTP request to get the file data
        const response = await axios.get(onlinePath, {
            responseType: 'arraybuffer', // Set the response type to arraybuffer to get the file data as a buffer
        });

        // Get the media buffer and determine the mimetype based on the file extension
        const mediaBuffer = Buffer.from(response.data).toString('base64');
        const mimetype = getMimetypeFromExtension(path);

        generateTextFromImage();
    } catch (error) {
        console.log('Error: ', error);
    }
});

// Start the bot.
bot.start();
