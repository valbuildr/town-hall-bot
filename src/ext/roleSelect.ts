import { ChannelType, Colors, ContainerBuilder, Events, GuildMemberRoleManager, LabelBuilder, MessageFlags, ModalBuilder, SlashCommandBuilder, TextInputStyle } from "discord.js";
import type { SlashCommandData } from ".";
import type Client from "../utils/Client";
import howDidWeGetHere from "../utils/howDidWeGetHere";
import { roleSelectTable } from "../db/schema/roleSelect";
import { Pagination } from "pagination.djs";
import { eq } from "drizzle-orm";
import { isMod } from "../utils/staffCheck";
import { YAML } from "bun";
import snowflake from "../snowflake";

type MenuRoles = {
    roleId: string;
    title: string;
    emoji?: string;
    description?: string;
};

// TODO: Better Role Select menu commands
export const slashCommands: SlashCommandData[] = [
    {
        // @ts-ignore
        data: new SlashCommandBuilder()
            .setName("role-select")
            .setDescription("Role Select menu commands")
            .addSubcommand(sc =>
                sc.setName("create")
                    .setDescription("Mod: Creates a Role Select menu.")
            )
            .addSubcommand(sc =>
                sc.setName("update")
                    .setDescription("Mod: Updates a Role Select menu.")
                    .addStringOption(opt =>
                        opt.setName("menu-id")
                            .setDescription("The ID of the menu to update.")
                            .setRequired(true)
                    )
                    .addBooleanOption(opt =>
                        opt.setName("yaml")
                            .setDescription("Input roles with YAML data. Defaults to False.")
                            .setRequired(false)
                    )
            )
            .addSubcommand(sc =>
                sc.setName("delete")
                    .setDescription("Mod: Deletes a Role Select menu.")
                    .addStringOption(opt =>
                        opt.setName("menu-id")
                            .setDescription("The ID of the menu to update.")
                            .setRequired(true)
                    )
            )
            .addSubcommand(sc =>
                sc.setName("send")
                    .setDescription("Mod: Sends a Role Select menu.")
                    .addStringOption(opt =>
                        opt.setName("menu-id")
                            .setDescription("The ID of the menu to send.")
                            .setRequired(true)
                    )
                    .addChannelOption(opt =>
                        opt.setName("channel")
                            .addChannelTypes(ChannelType.GuildText)
                            .setDescription("Where to send the menu.")
                            .setRequired(true)
                    )
            )
            .addSubcommand(sc =>
                sc.setName("info")
                    .setDescription("Mod: Get info on a specific Role Select menu.")
                    .addStringOption(opt =>
                        opt.setName("menu-id")
                            .setDescription("The ID of the menu to send.")
                            .setRequired(true)
                    )
            )
            .addSubcommand(sc =>
                sc.setName("list")
                    .setDescription("Mod: List Role Select menus.")
                    .addStringOption(opt =>
                        opt.setName("search")
                            .setDescription("Search menu titles.")
                            .setRequired(false)
                    )
            ),
        async execute(interaction) {
            const subcommand = interaction.options.getSubcommand(true);
            const client = interaction.client as Client;

            if (subcommand === "create") {
                const options = {
                    yaml: interaction.options.getBoolean("yaml", false) ?? false,
                }

                const modal = new ModalBuilder()
                    .setCustomId(snowflake.nextId().toString())
                    .setTitle("New Role Select Menu")
                    .addLabelComponents(
                        new LabelBuilder()
                            .setLabel("Menu Name")
                            .setDescription("This will be displayed at the top of the menu.")
                            .setTextInputComponent(t =>
                                t.setCustomId("title")
                                    .setMaxLength(100)
                                    .setStyle(TextInputStyle.Short)
                                    .setRequired(true)
                            ),
                        new LabelBuilder()
                            .setLabel("Maximum Selections")
                            .setDescription("The maximum amount of roles a user can select.")
                            .setTextInputComponent(t =>
                                t.setCustomId("max-roles")
                                    .setMaxLength(2)
                                    .setStyle(TextInputStyle.Short)
                                    .setRequired(true)
                            ),
                        new LabelBuilder()
                            .setLabel("Roles")
                            .setDescription("The roles users can choose. Seperated by new lines.")
                            .setTextInputComponent(t =>
                                t.setCustomId("roles")
                                    .setMaxLength(4000)
                                    .setPlaceholder("Role ID, Title, Emoji (optional), Description (optional)\n\n1335877858962182184, Feel Free, ✅\n1335877902331543635, Ask First\n1335877902331543635, Please Don't, ❌, Users may still message you if your DMs are open.")
                                    .setStyle(TextInputStyle.Paragraph)
                                    .setRequired(true)
                            )
                    );

                await interaction.showModal(modal);

                interaction.awaitModalSubmit({ time: 60_000 })
                    .then(async (i) => {
                        const rolesRegex = /^\d+, [^,\n]{1,100}(?:, [^,\n]{1,100}){0,2}$/;
                        const rolesIsValid = i.fields.getTextInputValue("roles").split("\n").every((ln) => rolesRegex.test(ln.trim()));

                        const nameRegex = /^.{1,100}$/;
                        const nameIsValid = nameRegex.test(i.fields.getTextInputValue("name").trim());

                        const maxRegex = /^([1-9]|1[0-9]|2[0-5])$/;
                        const maxIsValid = maxRegex.test(i.fields.getTextInputValue("max-roles").trim())

                        const errors = [];

                        if (!rolesIsValid) {
                            errors.push("'roles' input is invalid. Please ensure you're following the required syntax.");
                        }
                        if (!rolesIsValid) {
                            errors.push("'name' input is invalid. Please ensure you're providing a string under 100 characters.");
                        }
                        if (!rolesIsValid) {
                            errors.push("'name' input is invalid. Please ensure you're providing an integer anywhere from 1 to 25.");
                        }

                        const entry = client.db.insert(roleSelectTable).values({
                            name: i.fields.getTextInputValue("name")
                        })
                    })
                    .catch(async (err) => await interaction.followUp({ content: "No response collected.", flags: MessageFlags.Ephemeral }));
            } else if (subcommand === "update") {

            } else if (subcommand === "delete") {

            } else if (subcommand === "send") {

            } else if (subcommand === "info") {

            } else if (subcommand === "list") {

            }
            //  else {
            //     const hdwg = howDidWeGetHere("Please provide a valid subcommand.");
            //     await interaction.reply({ components: hdwg, flags: MessageFlags.IsComponentsV2 });
            //     return;
            // }
        },
    }
]

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