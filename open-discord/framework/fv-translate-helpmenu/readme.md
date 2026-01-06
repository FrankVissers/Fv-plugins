# 🌍 fv Translate Helpmenu

**A translation synchronization plugin for your all-in-one bot: [Open Ticket](https://openticket.dj-dj.be)**
Automatically syncs your slash command translations to the /help menu for a fully localized experience.

---

## 🚀 What does it do?

This plugin:
- Automatically reads translations from `ot-translate-cmds` and applies them to the help menu.
- Translates command names (e.g. `/close` -> `/sluit`) and options (e.g. `<reason>` -> `<reden>`).
- Preserves the original translated descriptions provided by Open Ticket.
- Works seamlessly in the background when the bot starts up.

---

## ⚙️ Installation

1. Make sure you have the `ot-translate-cmds` plugin installed and configured.
2. Add `fv-translate-helpmenu` to your bot project in the "plugins" folder.
3. Set your target language (locale) from `ot-translate-cmds` in the `config.json` in `fv-translate-helpmenu`  .
4. Still have questions or errors? You can report them at [our discord](https://fv.dev.qreen.tech)