import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Allowed origins for CORS - restrict to known domains
const ALLOWED_ORIGINS = [
  "https://id-preview--a3bbd5af-392b-4823-a4ba-524106d76b06.lovable.app",
  "https://lovable.app",
  "http://localhost:8080",
  "http://localhost:5173",
  "http://localhost:3000",
];

// Helper to get CORS headers for a specific origin
function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.some(allowed => 
    origin === allowed || origin.endsWith(".lovable.app")
  ) ? origin : ALLOWED_ORIGINS[0];
  
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

// Allowed ElevenLabs voice IDs
const ALLOWED_VOICE_IDS = [
  "EXAVITQu4vr4xnSDxMaL", // Sarah - default
  "21m00Tcm4TlvDq8ikWAM", // Rachel
  "AZnzlk1XvdvUeBnXmlld", // Domi
  "MF3mGyEYCl7XYWbV9V6O", // Elli
  "TxGEqnHWrfWFTfGW9XjX", // Josh
  "VR6AewLTigWG4xSOukaG", // Arnold
  "pNInz6obpgDQGcFmaJgB", // Adam
  "yoZ06aMxZJJ28mfd3POQ", // Sam
];

const MAX_TEXT_LENGTH = 1000; // Reasonable limit for educational TTS
// Increased to prevent normal assessment flows (question + feedback) from being rate-limited during testing.
const RATE_LIMIT_PER_HOUR = 300; // Maximum TTS requests per user per hour

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's auth context
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Unauthorized request:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check rate limit using direct query with user's auth context (RLS enforced)
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const { count: requestCount, error: rateLimitError } = await supabase
      .from('tts_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gt('created_at', oneHourAgo);

    if (rateLimitError) {
      console.error("Rate limit check error:", rateLimitError);
      // Continue without rate limiting if check fails, but log it
    } else if ((requestCount ?? 0) >= RATE_LIMIT_PER_HOUR) {
      console.warn(`User ${user.id} exceeded rate limit: ${requestCount} requests in last hour`);
      return new Response(
        JSON.stringify({ 
          error: "Rate limit exceeded. Please try again later.",
          retryAfter: 3600 // Suggest retry after 1 hour
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Retry-After": "3600"
          } 
        }
      );
    }

    // Parse and validate input
    const body = await req.json();
    const { text, voiceId = "EXAVITQu4vr4xnSDxMaL" } = body;

    // Validate text
    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "Valid text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trimmedText = text.trim();
    if (trimmedText.length === 0) {
      return new Response(
        JSON.stringify({ error: "Text cannot be empty" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (trimmedText.length > MAX_TEXT_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Text must be ${MAX_TEXT_LENGTH} characters or less` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate voiceId
    if (!ALLOWED_VOICE_IDS.includes(voiceId)) {
      return new Response(
        JSON.stringify({ error: "Invalid voice ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize text (remove potentially harmful characters)
    const sanitizedText = trimmedText.replace(/[<>]/g, "");

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY not configured");
    }

    console.log(`User ${user.id} generating TTS (request ${(requestCount || 0) + 1}/${RATE_LIMIT_PER_HOUR}): "${sanitizedText.substring(0, 50)}..."`);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: sanitizedText,
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.6,
            similarity_boost: 0.75,
            style: 0.3,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs error:", errorText);
      throw new Error(`TTS failed: ${response.status}`);
    }

    // Log successful TTS usage for rate limiting using direct insert with user's auth context (RLS enforced)
    const { error: logError } = await supabase
      .from('tts_usage')
      .insert({ 
        user_id: user.id, 
        character_count: sanitizedText.length 
      });

    if (logError) {
      console.error("Failed to log TTS usage:", logError);
      // Don't fail the request if logging fails
    }

    const audioBuffer = await response.arrayBuffer();

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (error: unknown) {
    console.error("TTS error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
