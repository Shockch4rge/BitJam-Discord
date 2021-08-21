const { Client, Intents, MessageEmbed } = require('discord.js');
const { getVoiceConnection, joinVoiceChannel } = require('@discordjs/voice')
const search = require('youtube-search')

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
    maxResults: 3,
    key: auth.YT_TOKEN, 
    type: 'video' 
}
bot.login(auth.BOT_TOKEN)


bot.on('ready', () => {
    console.log("BitJam is ready!")
})

// Search for a song
bot.on('messageCreate', async message => {
    if (message.author.bot) return
    if (message.channel.id !== "878329209280421918") return 

    let command = message.content.toLowerCase()
    console.log("COMMAND", command)

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

        let fetched = await search(query, opts).catch(err => console.log(err))

        if (fetched) {
            let youtubeResults = fetched.results
            
            let i = 0

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
                (m.author.id === message.author.id)
                && (m.content >= 1)
                && (m.content <= youtubeResults.length)

            let collected = await message.channel.awaitMessages(
                {
                    filter,
                    max: 1
                }
                ).catch(err => console.log(err))
            
            let selected = youtubeResults[collected.first().content - 1]

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
    if (message.channel.id !== "878329209280421918") return 

    let command = message.content.toLowerCase()

    if (command === `${PREFIX}play`) {
        await message.channel.send("playing....")
    }

})

// Pause
bot.on('messageCreate', async message => {
    if (message.author.bot) return 
    if (message.channel.id !== "878329209280421918") return

    let command = message.content.toLowerCase()

    if (command === `${PREFIX}pause`) {
        await message.channel.send("paused")
    }
})

// Next song in queue
bot.on('messageCreate', async message => {
    if (message.author.bot) return 
    if (message.channel.id !== "878329209280421918") return

    let command = message.content.toLowerCase()

    if (command === `${PREFIX}next`) {
        await message.channel.send("skipping to next song...")
    }
})

// Back song in queue
bot.on('messageCreate', async message => {
    if (message.author.bot) return 
    if (message.channel.id !== "878329209280421918") return

    let command = message.content.toLowerCase()

    if (command === `${PREFIX}back`) {
        await message.channel.send("skipping to previous song...")
    }
})

// Loop playlist -> song -> no loop
bot.on('messageCreate', async message => {
    if (message.author.bot) return 
    if (message.channel.id !== "878329209280421918") return

    let command = message.content.toLowerCase()

    if (command === `${PREFIX}loop`) {
        // get current looping state
        // disable loop if true, enable if false
    }
})

// Join VC
bot.on('messageCreate', async message => {
    if (message.author.bot) return 
    if (message.channel.id !== "878329209280421918") return

    let command = message.content.toLowerCase()

    if (command === `${PREFIX}hi`) {

        const isUserInVc = message.member.voice.channelId
        
        if (!isUserInVc) return await message.channel.send("You are not currently in a voice channel!")

        joinVoiceChannel({
            channelId: message.member.voice.channel.id,
            guildId: message.guild.id,
            adapterCreator: message.guild.voiceAdapterCreator
        })
        
        console.log(getVoiceConnection(message.guild.id))
    }
})

// Leave VC
bot.on('messageCreate', async message => {
    if (message.author.bot) return 
    if (message.channel.id !== "878329209280421918") return

    let command = message.content.toLowerCase()

    if (command === `${PREFIX}bye`) {
    
    }
})