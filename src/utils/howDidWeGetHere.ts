import { Colors, ContainerBuilder, TextDisplayBuilder } from "discord.js"

export default function build(msg: string) {
    return [
        new TextDisplayBuilder()
            .setContent(msg),
        new ContainerBuilder()
            .addTextDisplayComponents(td =>
                td.setContent(
                    [
                        "**Achievement Get!**",
                        "## <:thumb:1469535629854380124> How Did We Get Here?",
                        "Achieve the seemingly impossible.",
                        "",
                        "-# This means literally nothing, consider it an easter egg!"
                    ].join("\n")
                )
            )
            .setAccentColor(Colors.Gold)
    ]
}