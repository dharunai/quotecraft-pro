import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  type: 'quotation' | 'invoice' | 'stock_alert' | 'reminder';
  entityId?: string;
  to: string;
  cc?: string[];
  subject: string;
  body: string;
  pdfData?: string; // base64 encoded PDF
  pdfFilename?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header to identify user
    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const { type, entityId, to, cc, subject, body, pdfData, pdfFilename }: EmailRequest = await req.json();

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get company settings for from address
    const { data: settings } = await supabase
      .from("company_settings")
      .select("company_name, email")
      .limit(1)
      .single();

    const fromName = settings?.company_name || "CRM";
    const fromEmail = "onboarding@resend.dev"; // Resend requires verified domain for production

    // Prepare attachments if PDF provided
    const attachments = pdfData
      ? [
          {
            filename: pdfFilename || `${type}-${entityId || 'document'}.pdf`,
            content: pdfData,
          },
        ]
      : undefined;

    // Create email log entry (pending)
    const { data: emailLog, error: logError } = await supabase
      .from("email_logs")
      .insert({
        email_type: type,
        recipient_email: to,
        recipient_name: null,
        subject,
        body,
        entity_id: entityId || null,
        entity_type: type === 'quotation' || type === 'invoice' ? type : null,
        status: 'pending',
        sent_by: userId,
      })
      .select()
      .single();

    if (logError) {
      console.error("Error creating email log:", logError);
    }

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      cc: cc?.filter(email => emailRegex.test(email)),
      subject,
      html: body.replace(/\n/g, '<br>'),
      attachments,
    });

    console.log("Email sent successfully:", emailResponse);

    // Update email log with success
    if (emailLog) {
      await supabase
        .from("email_logs")
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq("id", emailLog.id);
    }

    return new Response(
      JSON.stringify({ success: true, messageId: emailResponse.data?.id }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    console.error("Error in send-email function:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
