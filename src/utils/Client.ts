import { Client as DClient, GatewayIntentBits, Collection, Partials, Events, MessageFlags } from "discord.js";
import type { SlashCommandData } from "../ext";
import type { ContextMenuData } from "../ext";

export default class Client<Ready extends boolean = boolean> extends DClient<Ready> {
    public slashCommands = new Collection<string, SlashCommandData>();
    public contextMenus = new Collection<string, ContextMenuData>();

    public addSlashCommand(data: SlashCommandData) {
        this.slashCommands.set(data.data.name, data);
    }
    public addContextMenu(data: ContextMenuData) {
        this.contextMenus.set(data.data.name, data);
    }

    constructor() {
        super({
            // all intents
            intents: Object.values(GatewayIntentBits).filter((v): v is GatewayIntentBits => typeof v === "number"),
            partials: [Partials.Channel],
        });

        this.on(Events.InteractionCreate, async (interaction) => {
            if (interaction.isChatInputCommand()) {
                const cmd = this.slashCommands.get(interaction.commandName);

                if (!cmd) {
                    console.error(`No command matching ${interaction.commandName} was found.`);
                    return;
                }

                try {
                    await cmd.execute(interaction);
                } catch (error) {
                    console.error(error);
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({
                            content: 'There was an error while executing this command!',
                            flags: MessageFlags.Ephemeral,
                        });
                    } else {
                        await interaction.reply({
                            content: 'There was an error while executing this command!',
                            flags: MessageFlags.Ephemeral,
                        });
                    }
                }
            } else if (interaction.isContextMenuCommand()) {
                const cmd = this.contextMenus.get(interaction.commandName);

                if (!cmd) {
                    console.error(`No command matching ID ${interaction.commandName} was found.`);
                    return;
                }

                try {
                    await cmd.execute(interaction);
                } catch (error) {
                    console.error(error);
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({
                            content: 'There was an error while executing this command!',
                            flags: MessageFlags.Ephemeral,
                        });
                    } else {
                        await interaction.reply({
                            content: 'There was an error while executing this command!',
                            flags: MessageFlags.Ephemeral,
                        });
                    }
                }
            }

            return;
        });
    }
}