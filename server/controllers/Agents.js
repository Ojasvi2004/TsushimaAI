const fs = require('fs');
const VoiceAgent = require("../schemas/VoiceAgent");

const E164 = /^\+[1-9]\d{7,14}$/;

// multer saves uploads before the controller runs, so delete them if we reject the request
const removeFiles = (files) => {
    Object.values(files || {}).flat().forEach((f) => {
        fs.unlink(f.path, () => {});
    });
};

const CreateVoiceAgent = async (req, res) => {
    const userId = req._id;

    const fail = (status, message) => {
        removeFiles(req.files);
        return res.status(status).json({ success: false, message });
    };

    if (!userId) {
        return fail(401, 'Unauthorized');
    }

    // the form sends everything except the files as a JSON string in "config"
    let config;
    try {
        config = JSON.parse(req.body.config);
    } catch (error) {
        return fail(400, 'Invalid agent settings.');
    }

    const b = config.behaviour || {};
    const c = config.call || {};
    const t = config.tts || {};
    const s = config.stt || {};

    if (!config.name?.trim() || !config.prompt?.trim() || !t.voiceId) {
        return fail(400, 'Name, instructions and voice are required.');
    }
    if (config.prompt.trim().length < 20) {
        return fail(400, 'Describe the job in at least 20 characters.');
    }
    if (c.number?.mode === 'own' && !E164.test(c.number.number || '')) {
        return fail(400, 'Use international format for the phone number, like +919876543210.');
    }
    if ((b.actions?.transfer || c.hours?.afterHours === 'transfer') && !E164.test(c.transferNumber || '')) {
        return fail(400, 'Add the number to transfer calls to, like +919876543210.');
    }
    if (c.hours && (!c.hours.days?.length || c.hours.from >= c.hours.to)) {
        return fail(400, 'Check the business hours: pick a day and make closing time after opening time.');
    }

    try {
        const voiceSample = req.files?.voiceSample?.[0];
        const documents = req.files?.['documents[]'] || [];

        // only the fields we expect are copied over, so the client can't set status, user or totals
        const myAgent = new VoiceAgent({
            user: userId,
            name: config.name.trim(),
            businessName: config.businessName?.trim(),
            template: config.template,
            prompt: config.prompt.trim(),
            timezone: config.timezone,
            behaviour: {
                tone: b.tone,
                formality: b.formality,
                replyLength: b.replyLength,
                initiative: b.initiative,
                greeting: b.greeting,
                rules: b.rules,
                collect: b.collect,
                actions: b.actions,
                backchannel: b.backchannel,
            },
            call: {
                direction: c.direction,
                number: {
                    mode: c.number?.mode,
                    country: c.number?.country,
                    number: c.number?.mode === 'own' ? c.number.number : undefined,
                },
                transferNumber: c.transferNumber || undefined,
                hours: c.hours || undefined,
                maxMinutes: c.maxMinutes,
                silenceHangupSeconds: c.silenceHangupSeconds,
                voicemailDetection: c.voicemailDetection,
                recordCalls: c.recordCalls,
                tellCallerAboutRecording: c.tellCallerAboutRecording,
            },
            tts: {
                voiceId: t.voiceId,
                speed: t.speed,
                pitch: t.pitch,
                cloneFromSample: !!voiceSample,
                voiceSample: voiceSample
                    ? { name: voiceSample.originalname, url: voiceSample.path }
                    : undefined,
            },
            stt: {
                languages: s.languages,
                mode: s.mode,
                noiseSuppression: s.noiseSuppression,
                autoDetectLanguage: s.autoDetectLanguage,
                interruptionSensitivity: s.interruptionSensitivity,
                endOfSpeechWaitSeconds: s.endOfSpeechWaitSeconds,
            },
            documents: documents.map((f) => ({
                name: f.originalname,
                url: f.path,
                size: f.size,
            })),
        });

        await myAgent.save();

        res.status(201).json({ success: true, message: 'Voice agent created', agent: myAgent });
    } catch (error) {
        console.error(" ERROR:", error);
        removeFiles(req.files);

        return res.status(400).json({
            success: false,
            message: "Error while creating voice agent",
            error: error.message,
        });
    }
};

module.exports = {
    CreateVoiceAgent,
};