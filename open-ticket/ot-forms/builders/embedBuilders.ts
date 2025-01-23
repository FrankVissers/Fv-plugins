import { api, openticket } from "#opendiscord";

// EMBEDS
openticket.events.get("onEmbedBuilderLoad").listen((embeds) => {

    /* START FORM EMBED
     * The embed that shows the initial form message with the Answer button.
     */
    embeds.add(new api.ODEmbed("ot-forms:start-form-embed"));
    embeds.get("ot-forms:start-form-embed").workers.add(
        new api.ODWorker("ot-forms:start-form-embed", 0, async (instance, params, source, cancel) => {
            const { formName, formDescription, formColor } = params;
            instance.setTitle(formName);
            instance.setDescription(formDescription);
            instance.setColor(formColor);
        })
    );

    /* CONTINUE EMBED
     * The embed that shows the continue button for a form.
     */
    embeds.add(new api.ODEmbed("ot-forms:continue-embed"));
    embeds.get("ot-forms:continue-embed").workers.add(
        new api.ODWorker("ot-forms:continue-embed", 0, async (instance, params, source, cancel) => {
            const { currentSection, totalSections, formColor } = params;
            instance.setColor(formColor);

            if(currentSection <= totalSections) { // Initial or partial answers
                instance.setTitle(`Section ${currentSection-1}/${totalSections} answered!`);
                instance.setDescription("Continue answering the next questions.");

            } else { // All questions answered
                instance.setTitle(`Form completed!`);
                instance.setDescription("You have answered all the questions.");
            }
        })
    );

    /* QUESTION EMBED
     * The embed that shows a question of a form and offers you the answers.
     */
    embeds.add(new api.ODEmbed("ot-forms:question-embed"));
    embeds.get("ot-forms:question-embed").workers.add(
        new api.ODWorker("ot-forms:question-embed", 0, async (instance, params, source, cancel) => {
            const { question, currentSection, totalSections, formColor } = params;
            instance.setTitle(`Question ${question.number}`);
            instance.setDescription(question.question);
            instance.setColor(formColor);
            instance.setFooter(`Section ${currentSection}/${totalSections}`);
        })
    );

    /* ANSWERS EMBED
     * The embed that shows the answers of a form for a user.
     */
    embeds.add(new api.ODEmbed("ot-forms:answers-embed"));
    embeds.get("ot-forms:answers-embed").workers.add(
        new api.ODWorker("ot-forms:answers-embed", 0, async (instance, params, source, cancel) => {
            const { type, user, formColor, fields, timestamp } = params;

            instance.setTitle(`Form Answers`);   
            instance.setAuthor(`${user.displayName} (ID: ${user.id})`, user.displayAvatarURL());
            instance.setTimestamp(timestamp);
            
            if ( type === "completed"  ) {
                instance.setColor(formColor);
                instance.setDescription(`<@${user.id}>`);
            } else {
                instance.setColor("#FF0000");
                instance.setDescription(`<@${user.id}> answering...`);
            }

            instance.addFields(...fields);
        })
    );
});