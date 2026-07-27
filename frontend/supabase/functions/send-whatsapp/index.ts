import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const META_ACCESS_TOKEN = Deno.env.get("META_ACCESS_TOKEN")!;
const META_PHONE_NUMBER_ID = Deno.env.get("META_PHONE_NUMBER_ID")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    console.log("Received payload:", JSON.stringify(payload));

    const record = payload.record;
    const studentId = record.student_id;
    const status = record.status;

    // Only proceed if the attendance status is marked 'present'
    if (status !== "present") {
      console.log("Status not present, skipping:", status);
      return new Response(JSON.stringify({ ok: true, skipped: true }), { status: 200 });
    }

    // Fetch the student's name, WhatsApp number, and remaining classes
    const { data: student, error } = await supabase
      .from("students")
      .select("name, parent_whatsapp, remaining_classes, total_classes")
      .eq("id", studentId)
      .single();

    if (error || !student) {
      console.log("Student lookup error:", JSON.stringify(error));
      return new Response(JSON.stringify({ error: "student not found" }), { status: 404 });
    }

    console.log("Student found:", JSON.stringify(student));

    // Construct the WhatsApp payload matching your Meta template variables:
    // {{1}} -> Student Name
    // {{2}} -> Remaining Classes
    const whatsappPayload = {
      messaging_product: "whatsapp",
      to: student.parent_whatsapp,
      type: "template",
      template: {
        name: "attendance_present", // Matches your Meta Template Name
        language: { code: "en" },   // Matches Meta "English" language code
        components: [
          {
            type: "body",
            parameters: [
              {
                type: "text",
                text: student.name, // Maps to {{1}}
              },
              {
                type: "text",
                text: String(student.remaining_classes), // Maps to {{2}}
              },
            ],
          },
        ],
      },
    };

    console.log("Sending to Meta:", JSON.stringify(whatsappPayload));

    // Send HTTP POST request to Meta Cloud API
    const metaRes = await fetch(
      `https://graph.facebook.com/v21.0/${META_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${META_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(whatsappPayload),
      }
    );

    const metaData = await metaRes.json();
    console.log("Meta response:", JSON.stringify(metaData));

    return new Response(JSON.stringify({ ok: true, meta: metaData }), { status: 200 });
  } catch (err) {
    console.log("Error caught:", String(err));
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});