import { api, opendiscord, utilities } from "#opendiscord";
import * as discord from "discord.js";
import { ChannelType } from "discord.js";
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



// Laad de configuratie
const configPath = path.join(process.cwd(), "plugins", "fv-server-stats", "config.json");
const config: Config = JSON.parse(fs.readFileSync(configPath, "utf-8"));


// Format string met waarden invullen
function formatString(format: string, values: Record<string, number>): string {
    let result = format;
    for (const [key, value] of Object.entries(values)) {
        result = result.replace(`{${key}}`, value.toString());
    }
    return result;
}

// Update statistieken
async function updateStats(guild: discord.Guild) {
    if (!config.enabled) return;

    try {
        const existingCategory = guild.channels.cache.find(
            c => c.type === ChannelType.GuildCategory && c.name === config.category.name
        ) as discord.CategoryChannel;

        if (existingCategory) {
            try {
                const channels = existingCategory.children.cache;
                for (const channel of channels.values()) {
                    await channel.delete();
                }
                await existingCategory.delete();
            } catch (error) {
                console.error('Fout bij verwijderen van bestaande categorie:', error);
                return;
            }
        }

        let statsCategory: discord.CategoryChannel;
        try {
            statsCategory = await guild.channels.create({
                name: config.category.name,
                type: ChannelType.GuildCategory,
                position: config.category.position
            });
        } catch (error) {
            console.error('Fout bij aanmaken van nieuwe categorie:', error);
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
                case 'totalMembers':
                    formatValues = { count: totalMembers };
                    break;
                case 'humanMembers':
                    formatValues = { count: humans };
                    break;
                case 'bots':
                    formatValues = { count: bots };
                    break;
                case 'boostLevel':
                    formatValues = { level: boostLevel };
                    break;
                case 'boostCount':
                    formatValues = { count: boostCount };
                    break;
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
                console.error(`Fout bij aanmaken van kanaal ${key}:`, error);
            }
        }
    } catch (error) {
        console.error('Fout bij bijwerken van serverstatistieken:', error);
    }
}

opendiscord.events.get("onClientReady").listen(async (clientManager) => {
    const client = clientManager.client;

    // Initial update bij opstarten
    client.guilds.cache.forEach(guild => {
        updateStats(guild);
        console.log(`stats channels refreshed on start up`);
    });

    // Lid toegevoegd
    client.on("guildMemberAdd", member => {
        updateStats(member.guild);
        console.log(`stats channels refreshed for new member`);
    });

    // Lid verwijderd
    client.on("guildMemberRemove", member => {
        updateStats(member.guild);
        console.log(`stats channels refreshed for removed member`);
    });

    // Boost count of tier veranderd
    client.on("guildUpdate", (oldGuild, newGuild) => {
        if (
            oldGuild.premiumTier !== newGuild.premiumTier ||
            oldGuild.premiumSubscriptionCount !== newGuild.premiumSubscriptionCount
        ) {
            updateStats(newGuild);
            console.log(`stats channels refreshed for new boost tier`);
        }
    });

    // Bot toegevoegd of veranderd
    client.on("guildMemberUpdate", (oldMember, newMember) => {
        if (oldMember.user.bot !== newMember.user.bot) {
            updateStats(newMember.guild);
            console.log(`stats channels refreshed for bot added or removed`);
        }
    });
});