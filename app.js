const { Client, Intents, MessageEmbed, Message } = require('discord.js');
const { getVoiceConnection, joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, VoiceConnection } = require('@discordjs/voice')
const searchYt = require('youtube-search')
const ytdl = require('ytdl-core')

const bot = new Client(
    { 
        intents: [
            Intents.FLAGS.GUILDS,
            Intents.FLAGS.GUILD_MESSAGES,
            Intents.FLAGS.GUILD_VOICE_STATES
        ] 
    }
)
const config = require('./config.json')
const auth = require('./auth.json')
const PREFIX = config.PREFIX
const opts = { 
    maxResults: 1,
    key: auth.YT_TOKEN, 
    type: 'video' 
}
bot.login(auth.BOT_TOKEN)

const queue = []
const player = createAudioPlayer()

bot.once('ready', () => {
    console.log("BitJam is ready!")
    bot.user.setPresence({ activities: [{ type: 'LISTENING', name: ">>help" }], status: 'online' })
})

bot.on('messageCreate', async message => {
    if (message.author.bot) return
    if (message.author != "217601815301062656") return

    let command = message.content.toLowerCase()

    if (command.startsWith(`${PREFIX}test`)) {
        let isUserInVc = message.member.voice.channel

        if (isUserInVc) {
            let connection

            connection = joinVoiceChannel(
                {
                    channelId: message.member.voice.channelId,
                    guildId: message.guildId,
                    adapterCreator: message.guild.voiceAdapterCreator
                }
            )
            connection.subscribe(player)

            let url = message.content.split(/\s+/)[1]
            let isValidUrl = ytdl.validateURL(url)
            
            if (isValidUrl) {
                console.log("Valid URL")
                queue.push(url)
                await message.channel.send({ content: "You've successfully added to the queue!" })
                await playSong()
            }
            // Invalid URL
            else {
                await message.delete().catch()
                let warning = await message.channel.send(
                    {
                        embeds: [new MessageEmbed()
                            .setAuthor("Invalid URL!", getBotAvatar())
                            .setColor('RED')
                        ]
                    }
                )
                await delay(7000)
                return await warning.delete().catch()
            }
        }
        // User is not in VC
        else {
            await message.delete().catch()
            let warning = await message.channel.send(
                {
                    embeds: [new MessageEmbed()
                        .setAuthor("You must be in a voice channel to use this command!", getBotAvatar())
                        .setColor('RED')
                    ]
                }
            )
            await delay(7000)
            return warning.delete().catch()
        }
               
    }
})

const playSong = async () => {
    const stream = ytdl(queue[0], { filter: 'audioonly' })
    const audioResource = createAudioResource(stream)
    player.play(audioResource)

    player.on(AudioPlayerStatus.Idle, async (_o, _n) => {
        if (audioResource.ended) {
            queue.shift()
    
            if (queue.length === 0) {
                player.stop()
                return
            }
    
            await playSong()
        }
       
    })
}

// Search for a song
bot.on('messageCreate', async message => {
    if (message.author.bot) return
    if (message.author != "217601815301062656") return

    let command = message.content.toLowerCase()

    if (command === `${PREFIX}search`) {
        let filter

        await message.channel.send(
            { 
                embeds: [new MessageEmbed()
                    .setColor("#C678DD")
                    .setTitle("Awaiting query...")
                    .setDescription("Search for a video!")] 
            }
        )

        filter = m => m.author.id === message.author.id
        
        let query = await message.channel.awaitMessages(
            { 
                filter, 
                max: 1, 
                time: 30000,
                errors: ['time']
            }
        ).catch (async _ => {
            await message.delete().catch()
            const timedOutMsg = await message.channel.send({ embeds: [new MessageEmbed().setTitle("❗  You ran out of time!")] })
            await delay(5000)
            return await timedOutMsg.delete().catch()
        })

        let fetched = await searchYt(query.first().content, opts).catch(err => console.log(err))

        if (fetched) {
            let i = 0
            let youtubeResults = fetched.results

            let titles = youtubeResults.map(result => {
                i++
                return i + ") " + result.title
            })

            await message.channel.send(
                { 
                    embeds: [new MessageEmbed()
                        .setColor("#C678DD")
                        .setTitle("Select the number of the song you want to use.")
                        .setDescription(titles.join("\n"))] 
                }
            )

            filter = m => 
                m.author.id === message.author.id
                && (!isNaN(m.content))
                && (m.content >= 1)
                && (m.content <= youtubeResults.length)

            let choice = await message.channel.awaitMessages(
                {
                    filter,
                    max: 1,
                    time: 30000,
                    errors: ['time']
                }
            ).catch(async _ => {
                await message.delete().catch()
                const timedOutMsg = await message.channel.send({ embeds: [new MessageEmbed().setTitle("❗  You ran out of time!")] })
                await delay(5000)
                return await timedOutMsg.delete().catch()
            })
            
            let selected = youtubeResults[choice.first().content - 1]

            await message.channel.send(
                { 
                    embeds: [new MessageEmbed()
                        .setAuthor(`${selected.title}`, getBotAvatar())
                        .setURL(`${selected.link}`)
                        .setDescription(`${selected.description}`)
                        .setImage(`${selected.thumbnails.default.url}`)] 
                }
            )
        }
    }
})

// Play
bot.on('messageCreate', async message => {
    if (message.author.bot) return
    if (message.author != "217601815301062656") return

    let command = message.content.toLowerCase()

    if (command.startsWith(`${PREFIX}play`)) {
        const isUserInVc = message.member.voice.channel

        if (!isUserInVc) { 
            await message.react('❌').catch()
            let warning = await message.channel.send(
                { 
                    embeds: [new MessageEmbed()
                        .setAuthor("You must be in a voice channel to use this command!", getBotAvatar())
                        .setColor('RED')
                    ] 
                }
            )
            await delay(7000)
            return await warning.delete().catch()
        }

        // Try to get url from second substring
        let providedLink = message.content.split(/\s+/)[1]
        
        if (!providedLink || providedLink.length <= 0 || !providedLink.includes("mp3")) {
            await message.react('❌').catch()
            let warning = await message.channel.send(
                { 
                    embeds: [new MessageEmbed()
                        .setAuthor("You didn't provide a valid link!", getBotAvatar())
                        .setDescription("Use `>>play <link>` and make sure it's a .mp3 file.")
                        .setColor('RED')
                    ] 
                }
            )
            await delay(7000)
            return await warning.delete().catch()
        }
        
        const audioResource = createAudioResource(providedLink)

        // Shouldn't be the case; check for good measure
        if (!audioResource.playStream) {
            throw new Error("audioResource.playStream is not valid.")
        }

        if (!audioResource.read()) {
            let warning = await message.channel.send(
                {
                    embeds: [new MessageEmbed()
                        .setAuthor("Unreadable file!", getBotAvatar())
                        .setColor('RED')
                    ]
                }
            )
            await delay(7000)
            return await warning.delete().catch()
        }

        // Delete the user command if link is accepted
        await message.delete().catch()

        queue.push(providedLink)

        const connection = joinVoiceChannel(
            {
                channelId: message.member.voice.channelId,
                guildId: message.guildId,
                adapterCreator: message.guild.voiceAdapterCreator
            }
        )

        connection.subscribe(player)
        player.play(audioResource)

        await message.react('✅').catch()
        const playingMsg = await message.channel.send(
            { 
                embeds: [new MessageEmbed()
                    .setAuthor("Playing...", getBotAvatar())
                    .setColor('GREEN')
                ] 
            }
        )
        
        player.on(AudioPlayerStatus.Idle, async (_o, _n) => {
            try {
                await playingMsg.delete()
                const finishedMsg = await message.channel.send(
                    { 
                        embeds: [new MessageEmbed()
                            .setAuthor("Finished playing!", getBotAvatar())
                            .setColor('GOLD')
                        ] 
                    }
                )
                await delay(5000)
                return await finishedMsg.delete()
            }
            catch (_) {
                // unimportant errors
            }
        })

        connection.on(VoiceConnectionStatus.Disconnected, async (_o, _n) => {
            try {
                queue.length = 0
                await playingMsg.delete()
                const disconnectedMsg = await message.channel.send(
                    { 
                        embeds: [new MessageEmbed()
                            .setAuthor("Disconnected. Bye!", getBotAvatar())
                            .setColor('YELLOW')
                        ] 
                    }
                )
                await delay(5000)
                return await disconnectedMsg.delete()
            }
            catch (_) {
            }
        })
    }
})

// Pause
bot.on('messageCreate', async message => {
    if (message.author.bot) return 

    let command = message.content.toLowerCase()

    if (command === `${PREFIX}pause`) {
        let isUserInVc = message.member.voice.channel

        if (!isUserInVc) { 
            try {
                await message.react('❌')
                let warning = await message.channel.send(
                    { 
                        embeds: [new MessageEmbed()
                            .setAuthor("You must be in a voice channel to use this command!", getBotAvatar())
                            .setColor('RED')
                        ] 
                    }
                )
                await delay(7000)
                return await warning.delete()
            } 
            catch (_) {
            }
        }

        let playerStatus = player.state.status

        if (playerStatus == AudioPlayerStatus.AutoPaused || playerStatus == AudioPlayerStatus.Paused) {
            try {
                await message.delete()
                let warning = await message.channel.send(
                    { 
                        embeds: [new MessageEmbed()
                            .setAuthor("The player is already paused!", getBotAvatar())
                            .setColor('YELLOW')
                        ] 
                    }
                )
                await delay(5000)
                return await warning.delete()
            }
            catch (_) {
            }
        }

        if (playerStatus == AudioPlayerStatus.Idle) {
            try {
                await message.delete()
                let warning = await message.channel.send(
                    { 
                        embeds: [new MessageEmbed()
                            .setAuthor("The player is currently idle.", getBotAvatar())
                            .setColor('YELLOW')
                        ] 
                    }
                )
                await delay(5000)
                return await warning.delete()
            } 
            catch (_) {}
        }

        // Try to pause
        const pauseSuccess = player.pause(true)

        if (pauseSuccess) {
            await message.react('✅').catch()
            return await message.channel.send(
                { 
                    embeds: [new MessageEmbed()
                        .setAuthor("The player is now paused.", getBotAvatar())
                        .setColor('GREEN')
                    ] 
                }
            )
        }
        else {
            await message.react('❓').catch()
            return await message.channel.send(
                { 
                    embeds: [new MessageEmbed()
                        .setAuthor("Could not pause player...?", getBotAvatar())
                        .setColor('RED')
                    ] 
                }
            )
        }
    }
})

bot.on('messageCreate', async message => {
    if (message.author.bot) return
    if (message.author != "217601815301062656") return

    const command = message.content.toLowerCase()

    if (command === `${PREFIX}resume`) {
        let isUserInVc = message.member.voice.channel

        if (!isUserInVc) { 
            await message.react('❌').catch()
            let warning = await message.channel.send(
                { 
                    embeds: [new MessageEmbed()
                        .setAuthor("You must be in a voice channel to use this command!", getBotAvatar())
                        .setColor('RED'),
                    ] 
                }
            )
            await delay(7000)
            return await warning.delete().catch()
        }

        if (!getVoiceConnection(message.guildId) || !(getVoiceConnection(message.guildId).state.status == VoiceConnectionStatus.Ready)) {
            await message.react('❌').catch()
            let warning = await message.channel.send(
                { 
                    embeds: [new MessageEmbed()
                        .setAuthor("The player is not in a voice channel!", getBotAvatar())
                        .setColor('RED')
                    ] 
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
                        .setColor('RED')
                    ] 
                }
            )
            await delay(7000)
            return await warning.delete().catch()
        }
        
        else if (playerStatus === AudioPlayerStatus.Idle) {
            await message.react('❗').catch()
            let warning = await message.channel.send(
                { 
                    embeds: [new MessageEmbed()
                        .setAuthor("The player is idle!", getBotAvatar())
                        .setColor('RED')
                    ] 
                }
            )
            await delay(7000)
            return await warning.delete().catch()
        }

        // Try to resume
        const resumeSuccess = player.unpause()

        if (resumeSuccess) {
            await message.react('✅').catch()
            return await message.channel.send(
                { 
                    embeds: [new MessageEmbed()
                        .setAuthor("Resuming...", getBotAvatar())
                        .setColor('GREEN')
                    ] 
                }
            )
        } 
        else {
            return await message.channel.send(
                { 
                    embeds: [new MessageEmbed()
                        .setAuthor("Could not resume player...?", getBotAvatar()
                        .setColor('RED'))
                    ] 
                }
            )
        }
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
                            { name: "`>>play <url>`", value: "Plays an MP3 file with the 'http://' extension.", inline: true },
                            { name: "`>>search`", value: "Searches for a song on Youtube.", inline: true }, 
                            { name: "`>>pause`", value: "Pauses the player.", inline: true }, 
                            { name: "`>>resume`", value: "Resumes the player.", inline: true },
                            { name: "`>>disconnect`", value: "Disconnects the player from the current voice channel.", inline: true },
                            { name: "`>>join`", value: "Makes the player join the current voice channel.", inline: true },
                        ]
                    )
                    .setFooter("❗  All commands listed here require you to be in a voice channel.")
                    .setColor("#2F3136")
                ]
            }
        )
    }
}) 

bot.on('messageCreate', async message => {
    if (message.author.bot) return

    const command = message.content.toLowerCase()

    if (command === `${PREFIX}queue`) {
        await message.delete().catch()

        const msg = await message.channel.send(
            {
                embeds: [new MessageEmbed()
                    .setAuthor(`${queue.length} ${queue.length === 1 ? "song" : "songs"} in the queue.`, getBotAvatar())
                ]
            }
        )
        await delay(15000)
        return await msg.delete().catch()
    }
})

// Utils
const getBotAvatar = () => {
    return bot.user.avatarURL({ format: 'png' })
}

const delay = t => {
    return new Promise(resolve => {
        setTimeout(resolve, t)
    })
}