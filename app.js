const { Client, Intents, MessageEmbed } = require('discord.js');
const { getVoiceConnection, joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice')
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

    bot.user.setPresence({ activities: [{ type: 'LISTENING', name: ">>help"}], status: 'online' })
})

bot.on('messageCreate', async message => {
    if (message.author.bot) return
    if (message.author != "217601815301062656") return

    let command = message.content.toLowerCase()

    if (command.startsWith(`${PREFIX}query`)) {
        // MC Weebs vc
        let voiceChannel = message.guild.channels.cache.find(channel => channel.id === "648180890178027531")
        let query = message.content.split(" ")
        let url = query[1]

        let isValidUrl = ytdl.validateURL(url)

        if (isValidUrl) {
            console.log("Valid URL!")

            let isInQueue = queue.some(Url => Url === url)

            if (!isInQueue) {
                queue.push(url)

                if (voiceChannel === null) {
                    console.log("Connection exists")

                    let embed = new MessageEmbed()
                        .setAuthor(bot.user.username, bot.user.displayAvatarURL)
                        //!!!!
                        .setDescription("You've successfully added " + songName + " to the queue!")
                }
                // Bot isn't connected to vc
                else {
                    try {
                        const connection = joinVoiceChannel(
                            {
                                channelId: message.member.voice.channelId,
                                guildId: message.guild.id,
                                adapterCreator: message.guild.voiceAdapterCreator
                            }
                        )

                        connection.subscribe(player)
                    }
                    catch(err) {
                        console.log(err)
                    }
                }
            }
            // Provided URL is already in the queue
            else {

            }
        }
        // Not a valid URL provided
        else {
            return await message.channel.send({ embeds: [new MessageEmbed().setTitle("❌  Not a valid URL!")] })
        }
    }
})

// async function playSong(messageChannel, voiceConnection, voiceChannel) {
//     const stream = ytdl(musicUrls[0], { filter: 'audioonly'})
//     const dispatcher = voiceConnection.
// }

// Search for a song
bot.on('messageCreate', async message => {
    if (message.author.bot) return
    if (message.author != "217601815301062656") return

    let command = message.content.toLowerCase()

    if (command === `${PREFIX}search`) {
        let embed
        let filter

        embed = new MessageEmbed()
            .setColor("#C678DD")
            .setTitle("Awaiting query...")
            .setDescription("Search for a video!")

        await message.channel.send({ embeds: [embed] })

        filter = m => m.author.id === message.author.id
        
        let query = await message.channel.awaitMessages(
            { 
                filter, 
                max: 1, 
                time: 30000 
            }
        ).catch(err => console.log(err))

        let fetched = await searchYt(query.first().content, opts).catch(err => console.log(err))

        if (fetched) {
            let i = 0
            let youtubeResults = fetched.results

            let titles = youtubeResults.map(result => {
                i++
                return i + ") " + result.title
            })

            embed = new MessageEmbed()
                .setColor("#C678DD")
                .setTitle("Select the number of the song you want to use.")
                .setDescription(titles.join("\n"))

            await message.channel.send({ embeds: [embed] })

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
            ).catch(_ => {
                return message.delete().catch(_ => console.log("Could not delete message."))
                    .then(message.channel.send({ embeds: [new MessageEmbed().setTitle("❗  You ran out of time!")] 
                }))
            })
            
            let selected = youtubeResults[choice.first().content - 1]

            embed = new MessageEmbed()
                .setTitle(`${selected.title}`)
                .setURL(`${selected.link}`)
                .setDescription(`${selected.description}`)
                .setThumbnail(`${selected.thumbnails.default.url}`)

            await message.channel.send({ embeds: [embed] })
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
            const warning = message.channel.send(
                { 
                    embeds: [new MessageEmbed()
                    .setTitle("❌  You must be in a voice channel to use this command!")
                    .setColor('RED')] 
                }
            )
            await delay(7000)
            return await warning.delete().catch()
        }

        // Try to get url from second substring
        let providedLink = message.content.split(/\s+/)[1]
        
        if (!providedLink || providedLink.length <= 0 || !providedLink.includes("mp3")) {
            const warning = await message.channel.send(
                { 
                    embeds: [new MessageEmbed()
                    .setTitle("❓  You didn't provide a (valid) link!")
                    .setDescription("Use `>>play <link>` and make sure it's a .mp3 file.")] 
                }
            )
            await delay(7000)
            return await warning.delete().catch()
        }
        
        // Delete the user command if link is accepted
        await message.delete().catch()

        const audioResource = createAudioResource(providedLink)
        const connection = joinVoiceChannel(
            {
                channelId: message.member.voice.channelId,
                guildId: message.guildId,
                adapterCreator: message.guild.voiceAdapterCreator
            }
        )

        connection.subscribe(player)
        player.play(audioResource)

        const playingMsg = await message.channel.send({ embeds: [new MessageEmbed().setTitle("✅  Playing audio...").setColor('GREEN')] })
        
        player.on(AudioPlayerStatus.Idle, async (o, n) => {
            await playingMsg.delete().catch()
            const finishedMsg = await message.channel.send({ embeds: [new MessageEmbed().setTitle("Finished playing!").setColor('GOLD')] })
            await delay(5000)
            return await finishedMsg.delete().catch()
        })

        connection.on(VoiceConnectionStatus.Disconnected, async (o, n) => {
            await playingMsg.delete().catch()
            const disconnectedMsg = await message.channel.send({ embeds: [new MessageEmbed().setTitle("👋  Disconnected. Bye!")] })
            await delay(5000)
            return await disconnectedMsg.delete().catch()
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
            const warning = await message.channel.send(
                { 
                    embeds: [new MessageEmbed()
                    .setTitle("❌ You must be in a voice channel to use this command!")
                    .setColor('RED')] 
                }
            )
            await delay(7000)
            return await warning.delete().catch()
        }
        
        if (AudioPlayerStatus.AutoPaused || AudioPlayerStatus.Paused) {
            await message.delete().catch()
            const warning = await message.channel.send({ embeds: [new MessageEmbed().setTitle("❗ The player is already paused.")] })
            await delay(5000)
            return await warning.delete().catch()
        }
        else if (AudioPlayerStatus.Idle) {
            await message.delete().catch()
            const warning = await message.channel.send({ embeds: [new MessageEmbed().setTitle("❗ The player is currently idle.")] })
            await delay(5000)
            return await warning.delete().catch()
        }

        player.pause()
    }
})

const delay = t => {
    return new Promise(resolve => {
        setTimeout(resolve, t)
    })
}