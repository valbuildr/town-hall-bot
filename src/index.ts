import { Client, Colors, ContainerBuilder, EmbedBuilder, Events, GatewayIntentBits, MessageFlags } from "discord.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.once(Events.ClientReady, (readyClient) => {
    console.log(`Logged in as ${readyClient.user.username}`);
});

client.on(Events.MessageCreate, async (message) => {
    if (message.guild && message.guildId === process.env.SERVER_ID && message.channelId === process.env.HONEYPOT_CHANNEL_ID && message.member) {
        const reason = "Sent a message in honeypot channel; assumed spam"
        const c = new ContainerBuilder()
            .addTextDisplayComponents(td =>
                td.setContent(`## You've been banned from val's town hall!\n> **Reason:** ${reason}\n\nIf you believe this to be in error or you wish for a second chance, appeal the punishment.\nTo appeal this punishment, visit **https://appeal.gg/UKVMvUG2h9** and fill out the Ban Appeal Form.`)
            )
            .setAccentColor(Colors.Red)
        await message.author.send({ components:[c], flags: MessageFlags.IsComponentsV2 });

        await message.member.ban({ reason });

        await message.delete();
    }
});

client.login(process.env.DISCORD_TOKEN);