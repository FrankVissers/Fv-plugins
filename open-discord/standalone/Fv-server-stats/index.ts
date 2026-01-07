import { api, opendiscord, utilities } from "#opendiscord";
import * as discord from "discord.js";
import { ChannelType, REST, Routes, SlashCommandBuilder } from "discord.js";
import * as fs from "fs";
import * as path from "path";

if (utilities.project != "openticket") throw new api.ODPluginError("This plugin only works in Open Ticket!");


interface ChannelConfig {
    format: string;
    enabled: boolean;
}

interface Config {
    enabled: boolean;
    category: {
        name: string;
        position: number;
    };
    channels: {
        totalMembers: ChannelConfig;
        humanMembers: ChannelConfig;
        bots: ChannelConfig;
        boostLevel: ChannelConfig;
        boostCount: ChannelConfig;
        link: ChannelConfig;
    };
}


const configPath = path.join(process.cwd(), "plugins", "fv-server-stats", "config.json");
const config: Config = JSON.parse(fs.readFileSync(configPath, "utf-8"));


const updateTimers = new Map<string, NodeJS.Timeout>();
const isUpdating = new Map<string, boolean>();



function formatString(format: string, values: Record<string, number | string>): string {
    let result = format;
    for (const [key, value] of Object.entries(values)) {
        result = result.replace(`{${key}}`, value.toString());
    }
    return result;
}


function getCleanupPatterns(): RegExp[] {
    const patterns: RegExp[] = [];
    
    for (const channelConfig of Object.values(config.channels)) {
        if (channelConfig.format) {

            let baseName = channelConfig.format.replace(/\{.*?\}/g, '').trim();
            


            if (baseName.length > 0) {
    
                const escaped = baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                
       
                patterns.push(new RegExp(`^${escaped}.*`, 'i')); 
            }
        }
    }
    return patterns;
}

function scheduleUpdate(guild: discord.Guild) {
    if (!config.enabled) return;

    if (updateTimers.has(guild.id)) {
        clearTimeout(updateTimers.get(guild.id));
    }

    // Wacht 10 seconden
    const timer = setTimeout(() => {
        updateStats(guild);
    }, 10000); 

    updateTimers.set(guild.id, timer);
}


async function updateStats(guild: discord.Guild) {
    if (isUpdating.get(guild.id)) return;
    isUpdating.set(guild.id, true);

    try {
        // --- STAP 1: OPRUIMEN (SLIMMER ZOEKEN) ---
        const cleanupPatterns = getCleanupPatterns();
        const allChannels = await guild.channels.fetch();

        // Zoek de categorie
        let existingCategory = allChannels.find(
            c => c && c.type === ChannelType.GuildCategory && c.name === config.category.name
        ) as discord.CategoryChannel | undefined;

        // Loop door ALLE kanalen
        for (const channel of allChannels.values()) {
            if (!channel) continue;

            // Sla de categorie zelf even over
            if (channel.type === ChannelType.GuildCategory && channel.name === config.category.name) {
                 continue; 
            }

            // Check alleen Voice Channels
            if (channel.type === ChannelType.GuildVoice) {
                // CHECK 1: Matcht de naam met onze "slimme" patronen?
                const matchesPattern = cleanupPatterns.some(regex => regex.test(channel.name));

                // CHECK 2: Zit hij in onze categorie?
                const isInCategory = existingCategory && channel.parentId === existingCategory.id;

                // Als één van beide waar is -> WEG ERMEE
                if (matchesPattern || isInCategory) {
                    try {
                        await channel.delete();
                        await new Promise(res => setTimeout(res, 200)); 
                    } catch (e) {
                        console.log(`channel ${channel.name} cant be deleted.`);
                    }
                }
            }
        }

  
        if (existingCategory) {
            try {
                await existingCategory.delete();
            } catch (e) { /* negeer */ }
        }


        
        let statsCategory: discord.CategoryChannel;
        try {
            statsCategory = await guild.channels.create({
                name: config.category.name,
                type: ChannelType.GuildCategory,
                position: config.category.position,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        deny: [discord.PermissionFlagsBits.Connect] 
                    }
                ]
            });
        } catch (error) {
            console.error('could make category:', error);
            isUpdating.set(guild.id, false);
            return;
        }

        const members = await guild.members.fetch({ withPresences: true });
        const totalMembers = members.size;
        const bots = members.filter(m => m.user.bot).size;
        const humans = totalMembers - bots;
        const boostLevel = guild.premiumTier;
        const boostCount = guild.premiumSubscriptionCount || 0;

        for (const [key, channelConfig] of Object.entries(config.channels)) {
            if (!channelConfig.enabled) continue;

            let formatValues = {};
            switch (key) {
                case 'totalMembers': formatValues = { count: totalMembers }; break;
                case 'humanMembers': formatValues = { count: humans }; break;
                case 'bots': formatValues = { count: bots }; break;
                case 'boostLevel': formatValues = { level: boostLevel }; break;
                case 'boostCount': formatValues = { count: boostCount }; break;
                case 'link': formatValues = { link: "discord.gg/..." }; break; 
            }

            const channelName = formatString(channelConfig.format, formatValues);

            try {
                await guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildVoice,
                    parent: statsCategory,
                    permissionOverwrites: [
                        {
                            id: guild.roles.everyone.id,
                            deny: [discord.PermissionFlagsBits.Connect]
                        }
                    ]
                });
            } catch (error) {
                console.error(`error while creating ${key}:`, error);
            }
        }
        console.log(`Stats succesesfully updated for ${guild.name}`);

    } catch (error) {
        console.error('major eror in updateStats:', error);
    } finally {
        isUpdating.set(guild.id, false);
    }
}

// --- EVENTS ---

opendiscord.events.get("onClientReady").listen(async (clientManager) => {
    const client = clientManager.client;

    const commands = [
        new SlashCommandBuilder()
            .setName('refreshstats')
            .setDescription('refreshes all server stats')
            .toJSON()
    ];

    client.guilds.cache.forEach(async (guild) => {
        updateStats(guild);
        
        try {
            const rest = new REST().setToken(client.token!);
            await rest.put(
                Routes.applicationGuildCommands(client.user!.id, guild.id),
                { body: commands },
            );
        } catch (error) {
            console.log(`cant register slash commands for ${guild.name}`);
        }
    });
    
    client.on("guildMemberAdd", m => scheduleUpdate(m.guild));
    client.on("guildMemberRemove", m => scheduleUpdate(m.guild));
    
    client.on("guildUpdate", (oldGuild, newGuild) => {
        if (oldGuild.premiumTier !== newGuild.premiumTier || 
            oldGuild.premiumSubscriptionCount !== newGuild.premiumSubscriptionCount) {
            scheduleUpdate(newGuild);
        }
    });

    client.on("guildMemberUpdate", (oldMember, newMember) => {
        if (oldMember.user.bot !== newMember.user.bot) {
            scheduleUpdate(newMember.guild);
        }
    });

    client.on("interactionCreate", async (interaction) => {
        if (!interaction.isChatInputCommand()) return;

        if (interaction.commandName === 'refreshstats') {
            // Check op permissie 'Kanalen Beheren' in plaats van Admin
            if (!interaction.memberPermissions?.has(discord.PermissionFlagsBits.ManageChannels)) {
                await interaction.reply({ content: 'no rights (ManageChannels needed).', ephemeral: true });
                return;
            }

            await interaction.reply({ content: '🧹 cleaning...', ephemeral: true });
            
            if (interaction.guild) {
                await updateStats(interaction.guild);
                await interaction.editReply({ content: '✅ all done!' });
            }
        }
    });


    
});

//REGISTER HELP MENU
opendiscord.events.get("onHelpMenuComponentLoad").listen((menu) => {
    menu.get("opendiscord:extra").add(new api.ODHelpMenuCommandComponent("fv-server-stats:refreshstats",0,{
        slashName:"/refreshstats",
        slashDescription:"refresh serverstats kanalen",
    }))
})