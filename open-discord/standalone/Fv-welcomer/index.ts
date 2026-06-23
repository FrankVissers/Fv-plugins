import { api, opendiscord, utilities } from "#opendiscord";
import * as discord from "discord.js";
import { ActionRowBuilder } from "discord.js";

import config from "./config.json" with { type: "json" };

let isListening = false;

opendiscord.events.get("onClientReady").listen((clientManager) => {
    const client = clientManager.client;

    if (isListening) return;
    isListening = true;

    client.on("guildMemberAdd", async (member) => {
        console.log(`${member.user.username} joined the server`);
        
        try {

            let welcomeChannel = member.guild.channels.cache.get(config.welcomeChannelId);
            
            if (!welcomeChannel) {
                welcomeChannel = await member.guild.channels.fetch(config.welcomeChannelId).catch(() => undefined) ?? undefined; 
            }

            if (welcomeChannel && welcomeChannel.isTextBased()) {
                const memberCount = member.guild.memberCount;

                const replacePlaceholders = (text: string) => {
                    return text
                        .replace(/{member}/g, `${member}`)
                        .replace(/{username}/g, member.user.username)
                        .replace(/{memberCount}/g, memberCount.toString());
                };

                const embed = new discord.EmbedBuilder()
                    .setColor(config.embedColor as discord.ColorResolvable) 
                    .setTitle(replacePlaceholders(config.messages.embedTitle))
                    .setDescription(replacePlaceholders(config.messages.embedDescription)) 
                    .setThumbnail(member.user.displayAvatarURL({ forceStatic: false }));
                if (config.bannerUrl) {
                    embed.setImage(config.bannerUrl);
                }

                const guildIcon = member.guild.iconURL();
                if (guildIcon) {
                    embed.setFooter({ text: config.messages.footerText, iconURL: guildIcon });
                } else {
                    embed.setFooter({ text: config.messages.footerText });
                }

                embed.setTimestamp(); 

                const button1 = new discord.ButtonBuilder()
                    .setLabel(config.button.label)
                    .setStyle(discord.ButtonStyle.Link) 
                    .setURL(config.button.url);

                const row1 = new ActionRowBuilder<discord.ButtonBuilder>()
                    .addComponents(button1);

                await welcomeChannel.send({
                    content: replacePlaceholders(config.messages.mentionText),
                    embeds: [embed],
                    components: [row1]
                });
            }
        } catch (error) {
            console.error(`Failed to send welcome message: ${error.message}`);
        }
    });
});