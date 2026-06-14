import { ActivityType, Colors, ContainerBuilder, Events, MessageFlags } from "discord.js";
import Client from "./utils/Client";
import cmds from "./ext";

const client = new Client();

client.once(Events.ClientReady, (readyClient) => {
    console.log(`Logged in as ${readyClient.user.username}`);
    readyClient.user.setActivity("DM to create a ticket | Version 0.1.1", { type: ActivityType.Playing });

    Object.entries(cmds).forEach(async ([k, v]) => {
        if (v.slashCommands) {
            v.slashCommands.forEach((cmd) => {
                client.addSlashCommand(cmd);
            })
        }

        if (v.contextMenus) {
            v.contextMenus.forEach((ctx) => {
                client.addContextMenu(ctx);
            })
        }

        if (v.setup) {
            await v.setup(readyClient as Client<true>);
        }

        console.log(`Loaded ${k} extension. Added ${v.slashCommands?.length ?? 0} slash command(s) and ${v.contextMenus?.length ?? 0} context menu(s).`);
    })
});

client.on(Events.MessageCreate, async (message) => {
    if (message.guild && message.guildId === process.env.SERVER_ID && message.channelId === process.env.HONEYPOT_CHANNEL_ID && message.member) {
        const reason = "Sent a message in honeypot channel; assumed spam"
        const c = new ContainerBuilder()
            .addTextDisplayComponents(td =>
                td.setContent(`## You've been banned from ${message.guild?.name ?? 'val\'s town hall'}!\n> **Reason:** ${reason}\n\nIf you believe this to be in error or you wish for a second chance, appeal the punishment.\nTo appeal this punishment, visit **https://appeal.gg/${process.env.PRIMARY_INVITE_SUFFIX!}** and fill out the Ban Appeal Form.`)
            )
            .setAccentColor(Colors.Red)
        await message.author.send({ components: [c], flags: MessageFlags.IsComponentsV2 });

        await message.member.ban({ reason });

        await message.delete();
    }
});

client.login(process.env.DISCORD_TOKEN);