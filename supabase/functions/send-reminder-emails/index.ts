import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting reminder email check...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all upcoming reminders that haven't been completed
    const now = new Date();

    console.log(`Checking for reminders that should be sent at ${now.toISOString()}`);

    const { data: upcomingReminders, error: remindersError } = await supabase
      .from("pet_events")
      .select(`
        id,
        title,
        description,
        event_date,
        event_type,
        pet_id,
        user_id,
        reminder_hours_before
      `)
      .eq("is_reminder", true)
      .eq("reminder_completed", false)
      .gte("event_date", now.toISOString());

    if (remindersError) {
      console.error("Error fetching reminders:", remindersError);
      throw remindersError;
    }

    console.log(`Found ${upcomingReminders?.length || 0} total upcoming reminders`);

    // Filter reminders based on their individual reminder_hours_before setting
    // A reminder should be sent if we're within the reminder window
    const remindersToSend = upcomingReminders?.filter((reminder) => {
      const eventDate = new Date(reminder.event_date);
      const hoursBeforeEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      const reminderHours = reminder.reminder_hours_before || 24;
      
      // Send if we're within the reminder window (between 0 and reminder_hours_before hours before event)
      // and haven't passed the 1-hour before check window (to avoid duplicate sends)
      const shouldSend = hoursBeforeEvent <= reminderHours && hoursBeforeEvent > (reminderHours - 1);
      
      if (shouldSend) {
        console.log(`Reminder "${reminder.title}" should be sent: ${hoursBeforeEvent.toFixed(2)} hours before event (window: ${reminderHours}h)`);
      }
      
      return shouldSend;
    }) || [];

    console.log(`${remindersToSend.length} reminders qualify to be sent now`);

    if (remindersToSend.length === 0) {
      return new Response(
        JSON.stringify({ message: "No reminders to send at this time", count: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Group reminders by user
    const remindersByUser: Record<string, typeof remindersToSend> = {};
    for (const reminder of remindersToSend) {
      if (!remindersByUser[reminder.user_id]) {
        remindersByUser[reminder.user_id] = [];
      }
      remindersByUser[reminder.user_id].push(reminder);
    }

    let emailsSent = 0;
    const errors: string[] = [];

    // Send emails for each user
    for (const [userId, userReminders] of Object.entries(remindersByUser)) {
      // Get user email from auth
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);

      if (userError || !userData?.user?.email) {
        console.error(`Could not get email for user ${userId}:`, userError);
        errors.push(`User ${userId}: Could not get email`);
        continue;
      }

      const userEmail = userData.user.email;

      // Get pet names for the reminders
      const petIds = [...new Set(userReminders.map(r => r.pet_id))];
      const { data: pets } = await supabase
        .from("pets")
        .select("id, name")
        .in("id", petIds);

      const petNames: Record<string, string> = {};
      pets?.forEach(pet => {
        petNames[pet.id] = pet.name;
      });

      // Build email content
      const eventTypeLabels: Record<string, string> = {
        vet_visit: "🏥 Vet Visit",
        grooming: "✂️ Grooming",
        medication: "💊 Medication",
        appointment: "📅 Appointment",
        other: "📌 Event",
      };

      const formatTimeUntil = (hours: number): string => {
        if (hours < 1) return "less than an hour";
        if (hours === 1) return "1 hour";
        if (hours < 24) return `${Math.round(hours)} hours`;
        const days = Math.round(hours / 24);
        return days === 1 ? "1 day" : `${days} days`;
      };

      const reminderList = userReminders.map(r => {
        const eventDate = new Date(r.event_date);
        const petName = petNames[r.pet_id] || "Your pet";
        const eventType = eventTypeLabels[r.event_type] || eventTypeLabels.other;
        const hoursUntil = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        const timeUntil = formatTimeUntil(hoursUntil);
        const formattedDate = eventDate.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });

        return `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">
              <strong>${eventType}</strong><br>
              <span style="color: #666;">${r.title}</span>
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; color: #8B5A2B;">${petName}</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">
              ${formattedDate}<br>
              <span style="color: #8B5A2B; font-size: 12px;">In ${timeUntil}</span>
            </td>
          </tr>
        `;
      }).join("");

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Pet Care Reminders</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #8B5A2B 0%, #D4A574 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🐾 Pet Care Reminders</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">You have upcoming pet care events</p>
          </div>
          
          <div style="background: #fff; padding: 20px; border: 1px solid #eee; border-top: none; border-radius: 0 0 12px 12px;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #f9f9f9;">
                  <th style="padding: 12px; text-align: left; font-weight: 600;">Event</th>
                  <th style="padding: 12px; text-align: left; font-weight: 600;">Pet</th>
                  <th style="padding: 12px; text-align: left; font-weight: 600;">When</th>
                </tr>
              </thead>
              <tbody>
                ${reminderList}
              </tbody>
            </table>
            
            <p style="margin-top: 20px; padding: 15px; background: #FFF8E7; border-radius: 8px; color: #8B5A2B;">
              💡 <strong>Tip:</strong> Mark events as complete in the app once you've done them!
            </p>
          </div>
          
          <p style="text-align: center; color: #999; font-size: 12px; margin-top: 20px;">
            This is an automated reminder from your Pet Care app.
          </p>
        </body>
        </html>
      `;

      try {
        console.log(`Sending reminder email to ${userEmail} for ${userReminders.length} events`);
        
        const { error: emailError } = await resend.emails.send({
          from: "Pet Care Reminders <onboarding@resend.dev>",
          to: [userEmail],
          subject: `🐾 ${userReminders.length} Pet Reminder${userReminders.length > 1 ? "s" : ""} for Today`,
          html: emailHtml,
        });

        if (emailError) {
          console.error(`Error sending email to ${userEmail}:`, emailError);
          errors.push(`Email to ${userEmail}: ${emailError.message}`);
        } else {
          emailsSent++;
          console.log(`Successfully sent reminder email to ${userEmail}`);
        }
      } catch (emailErr: unknown) {
        console.error(`Exception sending email to ${userEmail}:`, emailErr);
        const errMessage = emailErr instanceof Error ? emailErr.message : String(emailErr);
        errors.push(`Email to ${userEmail}: ${errMessage}`);
      }
    }

    console.log(`Reminder job complete. Emails sent: ${emailsSent}, Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({
        message: "Reminder emails processed",
        emailsSent,
        totalReminders: remindersToSend.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in send-reminder-emails function:", error);
    const errMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
