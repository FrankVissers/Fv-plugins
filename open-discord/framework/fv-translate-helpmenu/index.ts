import { api, opendiscord, utilities } from "#opendiscord"

// Interfaces
interface OTTranslateCmdsConfigOption {
    name: string
    type: string
    nameTranslations: Record<string, string>
    options?: OTTranslateCmdsConfigOption[]
}
interface OTTranslateCmdsConfigCommand {
    name: string
    nameTranslations: Record<string, string>
    options?: OTTranslateCmdsConfigOption[]
}

// Config
class OTTranslateHelpConfig extends api.ODJsonConfig<{ locale: string }> {
    declare data: {
        locale: string
    }
}

// Registreer config
opendiscord.events.get("onConfigLoad")?.listen((configs) => {
    configs.add(new OTTranslateHelpConfig("fv-translate-helpmenu:config", "config.json", "./plugins/fv-translate-helpmenu/"));
})

// Start synchronisatie - AANGEPAST NAAR 'onReadyForUsage'
opendiscord.events.get("onReadyForUsage")?.listen(async () => {
    const translateConfig = opendiscord.configs.get("ot-translate-cmds:translations")
    const myConfig = opendiscord.configs.get("fv-translate-helpmenu:config")

    // 1. Check Configs
    if (!translateConfig) {
        opendiscord.log("[FV-DEBUG-HELP] ❌ 'ot-translate-cmds' plugin not found!", "error")
        return
    }
    if (!myConfig) {
        opendiscord.log("[FV-DEBUG-HELP] ❌ 'fv-translate-helpmenu' plugin not found!", "error")
        return
    }

    const translations = translateConfig.data as OTTranslateCmdsConfigCommand[]
    const targetLocale = myConfig.data.locale

    opendiscord.log(`[FV-DEBUG-HELP] ℹ️ start to translate helpmenu to locale: '${targetLocale}'`, "plugin")
    opendiscord.log(`[FV-DEBUG-HELP] ℹ️ loaded translations: ${translations.length}`, "plugin")

    let count = 0
    const allCategories = opendiscord.helpmenu.getAll()

    for (const category of allCategories) {
        const components = category.getAll()
        for (const component of components) {
            // We verwerken alleen command components die beginnen met 'opendiscord:'
            if (component instanceof api.ODHelpMenuCommandComponent && component.id.value.startsWith("opendiscord:")) {
                const success = await processComponentById(component, translations, targetLocale)
                if (success) count++
            }
        }
    }

    opendiscord.log(`[FV-DEBUG-HELP] ✅ done! ${count} items changed.`, "plugin")
})

async function processComponentById(component: api.ODHelpMenuCommandComponent, translations: OTTranslateCmdsConfigCommand[], locale: string): Promise<boolean> {
    const rawId = component.id.value.replace("opendiscord:", "")
    
    // LOGICA: Zoek command & subcommands
    let cmdConfig = translations.find(t => t.name === rawId)
    let subConfig: OTTranslateCmdsConfigOption | undefined
    let commandName = rawId
    let subName: string | null = null

    // Als directe match faalt, probeer te splitten (bv 'blacklist-add')
    if (!cmdConfig && rawId.includes("-")) {
        const parts = rawId.split("-") 
        const mainPart = parts[0]
        const subPart = parts.slice(1).join("-")

        cmdConfig = translations.find(t => t.name === mainPart)
        if (cmdConfig && cmdConfig.options) {
            commandName = mainPart
            subName = subPart
            subConfig = cmdConfig.options.find(o => o.name === subName)
        }
    }

    if (!cmdConfig) {
        return false
    }

    // Check of vertaling bestaat voor deze taal
    const translatedCmd = cmdConfig.nameTranslations[locale]
    const finalCmdName = translatedCmd || commandName
    const finalSubName = subConfig ? (subConfig.nameTranslations[locale] || subName) : null

    // Huidige render ophalen
    const originalRender = await component.render(0, 0, 0, "slash")
    if (typeof originalRender !== 'string') return false
    
    const match = originalRender.match(/^`([^`]+)` ➜ (.*)$/)
    if (!match) {
        return false
    }
    
    const currentSlashContent = match[1] 
    const description = match[2]

    // Parameters vertalen
    const params = currentSlashContent.split(" ").filter(p => p.startsWith("<") || p.startsWith("["))
    const translatedParams: string[] = []
    const optionsScope = subConfig ? subConfig.options : cmdConfig.options

    for (const param of params) {
        const paramName = param.slice(1, -1)
        const isOptional = param.startsWith("[")
        
        let translatedParamName = paramName
        if (optionsScope) {
            const optMatch = optionsScope.find(o => o.name === paramName)
            if (optMatch && optMatch.nameTranslations[locale]) {
                translatedParamName = optMatch.nameTranslations[locale]
            }
        }
        translatedParams.push(isOptional ? `[${translatedParamName}]` : `<${translatedParamName}>`)
    }

    // Nieuwe string bouwen
    let newSlash = `/${finalCmdName}`
    if (finalSubName) newSlash += ` ${finalSubName}`
    if (translatedParams.length > 0) newSlash += ` ${translatedParams.join(" ")}`

    // Render overschrijven
    const oldRenderFunc = component.render.bind(component)
    component.render = (page, category, location, mode) => {
        if (mode === "slash") {
            return `\`${newSlash}\` ➜ ${description}`
        }
        return oldRenderFunc(page, category, location, mode)
    }

    return true
}