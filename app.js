const { Client, Intents, MessageEmbed, Message } = require('discord.js')
const { getVoiceConnection, joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, VoiceConnection } = require('@discordjs/voice')
const searchYt = require('youtube-search')
const ytdl = require('ytdl-core')
const config = require('./config.json')
const auth = require('./auth.json')

const bot = new Client(
    { 
        intents: [
            Intents.FLAGS.GUILDS,
            Intents.FLAGS.GUILD_MESSAGES,
            Intents.FLAGS.GUILD_VOICE_STATES
        ] 
    }
)

const PREFIX = config.PREFIX
const BOT_TOKEN = auth.BOT_TOKEN
const YT_TOKEN = auth.YT_TOKEN
const opts = { 
    maxResults: 1,
    key: YT_TOKEN, 
    type: 'audio' 
}
bot.login(BOT_TOKEN)

const queue = []
const player = createAudioPlayer()

bot.once('ready', () => {
    console.log("BitJam is ready!")
    bot.user.setPresence({ activities: [{ type: 'LISTENING', name: ">>help" }], status: 'online' })
})

// Search for a song
bot.on('messageCreate', async message => {
    if (message.author.bot) return

    const regex = new RegExp(/^>>search/)
    
    if (regex.test(message.content)) {
        let matches = message.content.match(/^>>search\s+(.+)/)

        if (!message.member.voice.channel) { 
            let warning = await message.channel.send(
                { 
                    embeds: [new MessageEmbed()
                    .setAuthor("You must be in a voice channel to use this command!", getBotAvatar())
                    .setColor('RED')] 
                }
            )
            await delay(7000)
            return await warning.delete().catch()
        }
        
        if (matches === null) {
            let warning = await message.channel.send(
                {
                    embeds: [new MessageEmbed()
                    .setAuthor("You didn't provide a query!", getBotAvatar())
                    .setDescription("Use `>>search <query>`.")
                    .setColor('RED')]
                }
            )
            await delay(7000)
            return await warning.delete().catch()
        }

        let query = matches[1]

        // Calls API
        const fetched = await searchYt(query, opts).catch(_ => console.log("Could not search"))

        if (!fetched) {
            let warning = await message.channel.send(
                {
                    embeds: [new MessageEmbed()
                    .setAuthor("Could not parse query.", getBotAvatar())
                    .setColor('RED')]
                }
            )
            await delay(5000)
            return await warning.delete().catch()
        }

        let result = fetched.results[0]

        // Not valid URL
        if (!ytdl.validateURL(result.link)) {
            let warning = await message.channel.send(
                {
                    embeds: [new MessageEmbed()
                    .setAuthor("Invalid URL!", getBotAvatar())
                    .setColor('RED')]
                }
            )
            await delay(7000)
            return await warning.delete().catch()
        } 

        // Delete all created messages if query is accepted
        await message.delete().catch()
        
        let stream = ytdl(result.link, { filter: 'audioonly' })
        const audioResource = createAudioResource(stream)
        const connection = joinVoiceChannel(
            {
                guildId: message.guildId,
                channelId: message.member.voice.channelId,
                adapterCreator: message.guild.voiceAdapterCreator
            }
        )

        connection.subscribe(player)
        player.play(audioResource)

        let playingMsg = await message.channel.send(
            { 
                embeds: [new MessageEmbed()
                .setAuthor("Now playing...", getBotAvatar())
                .setTitle(`${result.title}`)
                .setURL(`${result.link}`)
                .setImage(`${result.thumbnails.high.url}`)
                .setFooter(
                    audioResource.playbackDuration === 0 
                    ? "" 
                    : `Duration: ${formatDuration(audioResource.playbackDuration)}`
                )] 
            }
        )

        player.on('error', err => {
            console.log(err)
        })

        player.on(AudioPlayerStatus.Idle, async (_o, _n) => {
            let msg = await message.channel.send(
                {
                    embeds: [new MessageEmbed()
                    .setAuthor("Finished playing!", getBotAvatar())
                    .setColor('GOLD')]
                }
            )
            await playingMsg.delete().catch()
            await delay(10000)
            await msg.delete().catch()
        })
    }
})

// Play
bot.on('messageCreate', async message => {
    if (message.author.bot) return

    let command = message.content.toLowerCase()

    if (command.startsWith(`${PREFIX}play`)) {
        if (!message.member.voice.channel) { 
            let warning = await message.channel.send(
                { 
                    embeds: [new MessageEmbed()
                    .setAuthor("You must be in a voice channel to use this command!", getBotAvatar())
                    .setColor('RED')] 
                }
            )
            await delay(7000)
            return await warning.delete().catch()
        }

        // Try to get url from second substring
        let providedLink = message.content.split(/\s+/)[1]
        
        if (!providedLink || !validateURL(providedLink) || !providedLink.endsWith(".mp3")) {
            await message.react('❌').catch()
            let warning = await message.channel.send(
                { 
                    embeds: [new MessageEmbed()
                    .setAuthor("You didn't provide a valid link/file format!", getBotAvatar())
                    .setDescription("Use `>>play <link>`.")
                    .setColor('RED')] 
                }
            )
            await delay(7000)
            return await warning.delete().catch()
        }
        
        const audioResource = createAudioResource(providedLink)

        // Delete the user command if link is accepted
        await message.delete().catch()

        const connection = joinVoiceChannel(
            {
                channelId: message.member.voice.channelId,
                guildId: message.guildId,
                adapterCreator: message.guild.voiceAdapterCreator
            }
        )

        connection.subscribe(player)
        player.play(audioResource)

        let playingMsg = await message.channel.send(
            { 
                embeds: [new MessageEmbed()
                .setAuthor("Playing...", getBotAvatar())
                .setColor('GREEN')] 
            }
        )

        player.on(AudioPlayerStatus.Idle, async (_o, _n) => {
            await playingMsg.delete().catch()
        })
    }
})

// Pause
bot.on('messageCreate', async message => {
    if (message.author.bot) return 

    let command = message.content.toLowerCase()

    if (command === `${PREFIX}pause`) {
        if (!message.member.voice.channel) { 
            await message.react('❌').catch()
            let warning = await message.channel.send(
                { 
                    embeds: [new MessageEmbed()
                    .setAuthor("You must be in a voice channel to use this command!", getBotAvatar())
                    .setColor('RED')] 
                }
            )
            await delay(7000)
            return await warning.delete().catch()
        }

        if (!getVoiceConnection(message.guildId)) {
            await message.react('❌').catch()
            let warning = await message.channel.send(
                { 
                    embeds: [new MessageEmbed()
                    .setAuthor("The player is not in a voice channel!", getBotAvatar())
                    .setColor('RED')] 
                }
            )
            await delay(7000)
            return await warning.delete().catch()
        }

        let playerStatus = player.state.status

        if (playerStatus === AudioPlayerStatus.AutoPaused || playerStatus === AudioPlayerStatus.Paused) {
            await message.delete()
            let warning = await message.channel.send(
                { 
                    embeds: [new MessageEmbed()
                    .setAuthor("The player is already paused!", getBotAvatar())
                    .setColor('YELLOW')] 
                }
            )
            await delay(5000)
            return await warning.delete().catch()
        }

        if (playerStatus === AudioPlayerStatus.Idle) {
            await message.delete().catch()
            let warning = await message.channel.send(
                { 
                    embeds: [new MessageEmbed()
                    .setAuthor("The player is currently idle.", getBotAvatar())
                    .setColor('YELLOW')] 
                }
            )
            await delay(5000)
            return await warning.delete().catch()
        }

        // Try to pause
        let pauseSuccess = player.pause(true)

        if (!pauseSuccess) {
            await message.react('❓').catch()
            return await message.channel.send(
                { 
                    embeds: [new MessageEmbed()
                    .setAuthor("Could not pause player...?", getBotAvatar())
                    .setColor('RED')] 
                }
            )
            
        }

        await message.react('✅').catch()
        return await message.channel.send(
            { 
                embeds: [new MessageEmbed()
                .setAuthor("The player is now paused.", getBotAvatar())
                .setColor('GREEN')] 
            }
        )
    }
})

// Resume player
bot.on('messageCreate', async message => {
    if (message.author.bot) return
    
    const command = message.content.toLowerCase()

    if (command === `${PREFIX}resume`) {
        if (!message.member.voice.channel) { 
            await message.react('❌').catch()
            let warning = await message.channel.send(
                { 
                    embeds: [new MessageEmbed()
                    .setAuthor("You must be in a voice channel to use this command!", getBotAvatar())
                    .setColor('RED')] 
                }
            )
            await delay(7000)
            return await warning.delete().catch()
        }

        if (!getVoiceConnection(message.guildId)) {
            await message.react('❌').catch()
            let warning = await message.channel.send(
                { 
                    embeds: [new MessageEmbed()
                    .setAuthor("The player is not in a voice channel!", getBotAvatar())
                    .setColor('RED')] 
                }
            )
            await delay(7000)
            return await warning.delete().catch()
        }

        let playerStatus = player.state.status

        if (playerStatus === AudioPlayerStatus.Playing || playerStatus === AudioPlayerStatus.Buffering) {
            await message.react('❌').catch()
            let warning = await message.channel.send(
                { 
                    embeds: [new MessageEmbed()
                    .setAuthor("Something is already playing!", getBotAvatar())
                    .setColor('RED')] 
                }
            )
            await delay(7000)
            return await warning.delete().catch()
        }
        
        if (playerStatus === AudioPlayerStatus.Idle) {
            await message.react('❗').catch()
            let warning = await message.channel.send(
                { 
                    embeds: [new MessageEmbed()
                    .setAuthor("The player is idle!", getBotAvatar())
                    .setColor('RED')] 
                }
            )
            await delay(7000)
            return await warning.delete().catch()
        }

        // Try to resume
        const resumeSuccess = player.unpause()

        if (!resumeSuccess) {
            return await message.channel.send(
                { 
                    embeds: [new MessageEmbed()
                    .setAuthor("Could not resume player...?", getBotAvatar())
                    .setColor('RED')] 
                }
            )
        } 
        
        await message.react('✅').catch()
        return await message.channel.send(
            { 
                embeds: [new MessageEmbed()
                .setAuthor("Resuming...", getBotAvatar())
                .setColor('GREEN')] 
            }
        )
    }
})

bot.on('messageCreate', async message => {
    if (message.author.bot) return

    const command = message.content.toLowerCase()

    if (command === `${PREFIX}skip`) {
        if (!message.member.voice.channel) { 
            await message.react('❌').catch()
            let warning = await message.channel.send(
                { 
                    embeds: [new MessageEmbed()
                    .setAuthor("You must be in a voice channel to use this command!", getBotAvatar())
                    .setColor('RED')] 
                }
            )
            await delay(7000)
            return await warning.delete().catch()
        }

        if (!getVoiceConnection(message.guildId)) {
            await message.react('❌').catch()
            let warning = await message.channel.send(
                { 
                    embeds: [new MessageEmbed()
                    .setAuthor("The player is not in a voice channel!", getBotAvatar())
                    .setColor('RED')] 
                }
            )
            await delay(7000)
            return await warning.delete().catch()
        }

        if (queue.length === 0) {
            let msg = await message.channel.send(
                {
                    embeds: [new MessageEmbed()
                    .setAuthor("The queue is empty!", getBotAvatar())
                    .setColor('GOLD')]
                }
            )
            await delay(7000)
            return await msg.delete().catch()
        }

        queue.shift()


    }
})

bot.on('messageCreate', async message => {
    if (message.author.bot) return

    const command = message.content.toLowerCase()

    if (command === `${PREFIX}queue`) {
        if (!message.member.voice.channel) { 
            await message.react('❌').catch()
            let warning = await message.channel.send(
                { 
                    embeds: [new MessageEmbed()
                    .setAuthor("You must be in a voice channel to use this command!", getBotAvatar())
                    .setColor('RED')] 
                }
            )
            await delay(7000)
            return await warning.delete().catch()
        }

        await message.delete().catch()

        let msg = await message.channel.send(
            {
                embeds: [new MessageEmbed()
                .setAuthor(
                    `${queue.length} ${queue.length === 1 ? "song" : "songs"} in the queue.`, getBotAvatar())]
            }
        )
        await delay(15000)
        return await msg.delete().catch()
    }
})

bot.on('messageCreate', async message => {
    if (message.author.bot) return

    const command = message.content.toLowerCase()

    if (command.startsWith(`${PREFIX}bruh`)) {
        let example = message.content.split(/\s+/, 3)
        console.log(example)
    }
})

bot.on('messageCreate', async message => {
    if (message.author.bot) return

    const regex = new RegExp(/^>>ping/)

    if (regex.test(message.content)) {
        await message.channel.send(
            {
                embeds: [new MessageEmbed()
                .setAuthor(`Pong!  ${bot.ws.ping}ms`, getBotAvatar())
                .setColor('GREEN')]
            }
        )
    }
})

// Help
bot.on('messageCreate', async message => {
    if (message.author.bot) return

    const command = message.content.toLowerCase()

    if (command === `${PREFIX}help`) {
        await message.delete().catch()

        await message.channel.send(
            {
                embeds: [new MessageEmbed()
                .setAuthor("Commands", getBotAvatar())
                .setFields(
                    [
                        { name: "`>>play <url>`", value: "Plays an MP3 file or a YouTube link.", inline: true },
                        { name: "`>>search <query>`", value: "Searches for a song on Youtube.", inline: true }, 
                        { name: "`>>pause`", value: "Pauses the player.", inline: true }, 
                        { name: "`>>resume`", value: "Resumes the player.", inline: true },
                        { name: "`>>skip`", value: "Skips to the next song in the queue, if there is one.", inline: true },
                        { name: "`>>queue`", value: "Displays the current queue.", inline: true },
                        { name: "`>>hi`", value: "Makes the player join the current voice channel.", inline: true },
                        { name: "`>>bye`", value: "Disconnects the player from the current voice channel.", inline: true },
                        { name: "`>>ping`", value: "Check the response time of the bot.", inline: true }
                    ]
                )
                .setFooter("❗  All commands listed here require you to be in a voice channel.")
                .setColor("#2F3136")]
            }
        )
    }
}) 


// Utils
const getBotAvatar = () => {
    return bot.user.avatarURL({ format: 'png' })
}

const delay = ms => {
    return new Promise(resolve => {
        setTimeout(resolve, ms)
    })
}

const formatDuration = ms => {
    const min = ms / 1000 / 60
    const sec = ms / 1000 % 60

    return min + ":" + ((sec < 10) ? "0" + sec : sec)
}