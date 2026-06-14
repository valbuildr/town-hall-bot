import { Colors, ContainerBuilder, Events, GuildMemberRoleManager, MessageFlags } from "discord.js";
import type { SlashCommandData } from ".";
import type Client from "../utils/Client";
import howDidWeGetHere from "../utils/howDidWeGetHere";
import { roleSelectTable } from "../db/schema/roleSelect";
import { Pagination } from "pagination.djs";
import { eq } from "drizzle-orm";
import { isMod } from "../utils/staffCheck";

type MenuRoles = {
    roleId: string;
    title: string;
    emoji?: string;
    description?: string;
};

// TODO: Role Select menu commands

export async function setup(client: Client) {
    client.on(Events.InteractionCreate, async (interaction) => {
        if (interaction.isStringSelectMenu() && interaction.customId.startsWith("rs:") && interaction.guild) {
            const entries = await client.db.select().from(roleSelectTable).where(eq(roleSelectTable.id, interaction.customId.split(":")[1]!));

            if (entries.length < 1) {
                await interaction.reply({ content: "Menu not found.", flags: MessageFlags.Ephemeral });
            } else {
                const entry = entries[0];

                const roles = JSON.parse(entry!.roles) as MenuRoles[];
                const roleIds = roles.map((r) => r.roleId);

                const removed: string[] = [];
                const added: string[] = [];

                interaction.values.forEach(async (v) => {
                    if (roleIds.includes(v)) {
                        if (interaction.member!.roles instanceof GuildMemberRoleManager && interaction.member!.roles.cache.has(v)) {
                            removed.push(v);
                            await interaction.member!.roles.remove(v);
                        } else if (interaction.member!.roles instanceof GuildMemberRoleManager && !interaction.member!.roles.cache.has(v)) {
                            added.push(v);
                            await interaction.member!.roles.add(v);
                        }
                    }
                });

                const container = new ContainerBuilder()
                    .addTextDisplayComponents(td => td.setContent("## Updated roles"))
                    .setAccentColor(Colors.Blurple);

                if (removed.length >= 1) {
                    container.addTextDisplayComponents(td => td.setContent(`### Removed\n${removed.map((r) => `<@&${r}>`).join("\n")}`))
                }
                if (added.length >= 1) {
                    container.addTextDisplayComponents(td => td.setContent(`### Added\n${added.map((r) => `<@&${r}>`).join("\n")}`))
                }
                if (removed.length == 0 && added.length == 0) {
                    container.addTextDisplayComponents(td => td.setContent("No changes were made."))
                }

                await interaction.reply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2], allowedMentions: { users: [], roles: [] } });
            }
        }
    });
}