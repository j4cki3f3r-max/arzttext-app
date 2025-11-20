// netlify/functions/arzttext-ai.js

// CommonJS style export for Netlify Functions
exports.handler = async (event, context) => {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: "Method not allowed",
      };
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: "OPENAI_API_KEY is not set",
      };
    }

    const body = JSON.parse(event.body || "{}");
    const notes = body.notes || "";

    if (!notes) {
      return {
        statusCode: 400,
        body: "Missing 'notes' field in request body",
      };
    }

    const systemPrompt =
      "Du bist ein deutscher medizinischer Dokumentationsassistent. " +
      "Du erhältst stichwortartige Notizen einer Ärztin (internistische/ intensivmedizinische Visite) " +
      "und sollst daraus einen gut formulierten, knappen, fachlich korrekten Text erzeugen. " +
      "Schreibe in vollständigen deutschen Sätzen, in einem nüchternen klinischen Stil, " +
      "geeignet für den Abschnitt 'Verlauf' oder 'Beurteilung/Empfehlung' in einem Arztbrief. " +
      "Keine Patientennamen, keine Identifikationsdaten, keine Spekulationen. " +
      "Falls unklar, bleibe allgemein. Länge: typischerweise 3–7 Sätze.";

    const userPrompt =
      "Stichworte der Visite / Anamnese:\n" +
      notes +
      "\n\nErzeuge bitte einen passenden Textvorschlag auf Deutsch.";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 512,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", errorText);
      return {
        statusCode: 500,
        body: "OpenAI API error: " + errorText,
      };
    }

    const data = await response.json();
    const aiMessage =
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content;

    if (!aiMessage) {
      return {
        statusCode: 500,
        body: "No AI message returned",
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ aiText: aiMessage }),
    };
  } catch (err) {
    console.error("Function error:", err);
    return {
      statusCode: 500,
      body: "Server error: " + (err.message || String(err)),
    };
  }
};

