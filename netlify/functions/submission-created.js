// path: /netlify/functions/submission-created.js
/* eslint-disable no-console */

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const submission = body.payload || {};

    console.log("📩 Incoming event body:", JSON.stringify(submission, null, 2));

    // Netlify always sends form name as "form-name"
    const formName =
      submission["form-name"] ||
      submission.form_name ||
      submission.data?.["form-name"];

    if (!formName || formName !== "popup-contact") {
      console.log("⏩ Skipped form, form_name =", formName);
      return { statusCode: 200, body: "" };
    }

    // Extract fields
    const data = submission.data || {};
    const {
      first_name,
      last_name,
      email,
      country_code,
      phone,
      apartment,
      buyer_type,
    } = data;

    const fullName =
      `${first_name || ""} ${last_name || ""}`.trim() || "No Name";

    // Referral URL auto from Netlify payload (fallback if missing)
    const finalReferralUrl =
      data.referrer ||
      submission.referrer ||
      submission.site_url ||
      "https://";

    // --- Buyer Type mapping (enum IDs from Bitrix) ---
    const buyerTypeMap = {
      "Investor": "112",
      "End User": "110",
    };

    // Build CRM payload
    const payload = {
      fields: {
        TITLE: `Emaar Landing Page | ${fullName}`,
        NAME: fullName,
        PHONE: phone
          ? [
              {
                VALUE: `${country_code || ""}${phone}`,
                VALUE_TYPE: "WORK",
              },
            ]
          : [],
        EMAIL: email ? [{ VALUE: email, VALUE_TYPE: "WORK" }] : [],
        SOURCE_ID: "WEB",
        UF_CRM_1758787478796: finalReferralUrl, // referral URL
        UF_CRM_1759308722148: apartment || "", // apartment choice (text field)
        UF_CRM_1735997616595: buyerTypeMap[buyer_type] || "", // Buyer type (enum ID)
      },
    };

    console.log(
      "🚀 Payload sending to CRM:",
      JSON.stringify(payload, null, 2)
    );

    const crmUrl =
      "https://aghali.bitrix24.com/rest/1556/jz1gs87s9qs0qnzr/crm.lead.add.json";

    const response = await fetch(crmUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    let resultText = await response.text();
    console.log("✅ CRM response:", resultText);

    return { statusCode: 200, body: "" };
  } catch (err) {
    console.error("❌ Error:", err.message);
    return { statusCode: 200, body: "" };
  }
};
