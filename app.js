const { Client, Intents, MessageEmbed } = require('discord.js');
const { getVoiceConnection, joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice')
const searchYt = require('youtube-search')
const ytdl = require('ytdl-core')

const bot = new Client({ 
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_VOICE_STATES
    ] 
})
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

async function playSong(messageChannel, voiceConnection, voiceChannel) {
    const stream = ytdl(musicUrls[0], { filter: 'audioonly'})
    // const dispatcher = voiceConnection.
}

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
            ).catch(err => console.log(err))
            
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

/**
 * 
 * Play
 */
bot.on('messageCreate', async message => {
    if (message.author.bot) return
    if (message.author != "217601815301062656") return

    let command = message.content.toLowerCase()

    if (command.startsWith(`${PREFIX}play`)) {
        const isUserInVc = message.member.voice.channel

        if (!isUserInVc) { 
            return await message.channel.send({ embeds: [new MessageEmbed().setTitle("❌  You must be in a voice channel to use this command!")] })
        }

        let args = message.content.split(/\s+/)
        let providedUrl = args[1]
        
        if (providedUrl == null || providedUrl.length <= 0) {
            return await message.channel.send(
                { embeds: [new MessageEmbed().setTitle("❓  You didn't provide a link!").setDescription("Use `>>play <link>` instead.")] }
            )
        }
        
        let audioResource = createAudioResource(providedUrl)
        await message.delete().catch(err => console.log("(BitJam) -> ", `Could not delete message: ${message.content}`))
    
        const connection = joinVoiceChannel(
            {
                channelId: message.member.voice.channelId,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator
            }
        )

        connection.subscribe(player)
        player.play(audioResource)

        await message.channel.send(
            { embeds: [new MessageEmbed().setTitle("✅  Playing audio...").setColor('GREEN')]}
        )

        player.on('stateChange', (oldState, newState) => {
            if (newState.status === AudioPlayerStatus.AutoPaused) {
                return message.channel.send({ embeds: [new MessageEmbed().setTitle(`👋  Disconnected from ${message.member.voice.channel.name}`)] })
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
            return await message.channel.send(
                { embeds: [new MessageEmbed().setTitle("❌ You must be in a voice channel to use this command!")] }).catch(err => console.log(err)
            )
        }

        if (player.state.status === AudioPlayerStatus.AutoPaused || AudioPlayerStatus.Paused) {
            return await message.channel.send({ content: "❗ The player is already paused."}).catch(err => console.log(err))
        }
        
        if (player.state.status === AudioPlayerStatus.Idle) {
            return await message.channel.send({ content: "❗ The player is idle."})
        }

        player.pause()
    }
})

// Next song in queue
bot.on('messageCreate', async message => {
    if (message.author.bot) return 

    let command = message.content.toLowerCase()

    if (command === `${PREFIX}next`) {
        await message.channel.send({ content: "skipping to next song..." })
    }
})

// Back song in queue
bot.on('messageCreate', async message => {
    if (message.author.bot) return 

    let command = message.content.toLowerCase()

    if (command === `${PREFIX}back`) {
        await message.channel.send({ content: "skipping to previous song..." })
    }
})

// Loop playlist -> song -> no loop
bot.on('messageCreate', async message => {
    if (message.author.bot) return 

    let command = message.content.toLowerCase()

    if (command === `${PREFIX}loop`) {
        // get current looping state
        // disable loop if true, enable if false
    }
})

// Join VC
bot.on('messageCreate', async message => {
    if (message.author.bot) return 

    let command = message.content.toLowerCase()

    if (command === `${PREFIX}hi`) {
        let isUserInVc = message.member.voice.channelId

        if (!isUserInVc) { 
            return await message.channel.send({ content: "❌ You must be in a voice channel to use this command!" })
        }

        const connection = joinVoiceChannel(
            {
                channelId: message.member.voice.channelId,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator
            }
        )
        
        connection.subscribe(player)
        
    }
})

// Leave VC
bot.on('messageCreate', async message => {
    if (message.author.bot) return 

    let command = message.content.toLowerCase()

    if (command === `${PREFIX}bye`) {
        let isUserInVc = message.member.voice.channelId

        if (!isUserInVc) { 
            return await message.channel.send({ embeds: [new MessageEmbed().setTitle("❌ You must be in a voice channel to use this command!")] })
        }

        let alreadyConnected = getVoiceConnection(message.member.voice.guild.id)

        if (alreadyConnected == null) {
            return await message.channel.send({ embeds: [new MessageEmbed().setTitle("❓ I'm not connected to a voice channel!" )] })
        }

        const connection = joinVoiceChannel(
            {
                channelId: message.member.voice.channelId,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator
            }
        )

        connection.subscribe(player) 
        connection.destroy()
    }
})