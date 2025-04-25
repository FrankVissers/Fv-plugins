import { api, opendiscord, utilities } from "#opendiscord";
import * as discord from "discord.js";
import { ActionRowBuilder } from "discord.js";

opendiscord.events.get("onClientReady").listen((clientManager) => {
    const client = clientManager.client;

    client.on("guildMemberAdd", async (member) => {
        const welcomeChannelId = "1215639907280617513"; 
        console.log(`${member.user.username} joined the server`);
        try {
            let welcomeChannel = member.guild.channels.cache.get(welcomeChannelId);
            if (!welcomeChannel) {
                const fetchedChannel = await member.guild.channels.fetch(welcomeChannelId).catch(() => undefined);
                welcomeChannel = fetchedChannel ?? undefined; 
            }

            if (welcomeChannel && welcomeChannel.isTextBased()) {
                const memberCount = member.guild.memberCount;
                const embed = new discord.EmbedBuilder()
                    .setColor(0x0099ff)
                    .setTitle(`Welcome to the server, ${member.user.username}! 🎉`)
                    .setDescription(`Hey ${member}, we're glad to have you here! you are the ${memberCount} member!`) 
                    .setThumbnail(member.user.displayAvatarURL())
                    .setImage('https://fv.dev.qreen.tech/fotos/standard.gif') // Voeg hier de URL van je bannerafbeelding toe
                    .setFooter({ text: 'Enjoy your stay!', iconURL: member.guild.iconURL() || '' }) 
                    .setTimestamp(); 

                // Maak knoppen aan
                const button1 = new discord.ButtonBuilder()
                    .setLabel('View our website')
                    .setStyle(discord.ButtonStyle.Link) 
                    .setURL('https://fv.dev.qreen.tech'); // Vervang dit door de gewenste URL

                const row1 = new ActionRowBuilder<discord.ButtonBuilder>()
                    .addComponents(button1);
    
                await welcomeChannel.send({
                    content: `Welcome to the server, ${member}! 🎉`,
                    embeds: [embed],
                    components: [row1]
                });
            }
        } catch (error) {
            console.error(`Failed to send welcome message: ${error.message}`);
        }
    });
});