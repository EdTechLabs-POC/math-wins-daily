import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { studentAge, previousResponses = [], questionIndex = 0 } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Build context from previous responses
    const previousContext = previousResponses.length > 0
      ? `Previous questions and answers:\n${previousResponses.map((r: { question: string; answer: string; correct: boolean }, i: number) => 
          `Q${i + 1}: ${r.question}\nStudent answered: ${r.answer} (${r.correct ? 'correct' : 'incorrect'})`
        ).join('\n\n')}`
      : '';

    const systemPrompt = `You are an educational assessment AI for children ages 5-8. Your task is to generate age-appropriate math questions to determine the child's skill level.

Rules:
1. Generate ONE question at a time
2. Questions should be visual and engaging
3. Start with easy counting (numbers 1-5)
4. If correct, gradually increase difficulty
5. If incorrect, slightly decrease or maintain difficulty
6. After 3-5 questions, you can determine the appropriate level

Levels:
- level_1: Basic counting 1-10, simple object recognition
- level_2: Counting to 20, place value basics, simple addition

Question types to use:
- count_objects: "How many [objects] do you see?" with a number answer
- tap_count: "Tap each [object] to count them"
- multiple_choice: Simple math with 4 choices
- comparison: "Which group has more?"

${previousContext}

Generate question ${questionIndex + 1}. After analyzing the responses (if any), decide what difficulty to present next.

Return JSON in this exact format:
{
  "question": {
    "type": "count_objects" | "multiple_choice" | "comparison",
    "instruction": "The instruction to show the child",
    "voicePrompt": "What to read aloud to the child",
    "imageDescription": "Description of what visual to show",
    "options": [{"value": 1, "label": "1"}, ...] (for multiple choice),
    "correctAnswer": 3,
    "objectCount": 3 (for counting questions),
    "objectType": "apples" (for counting questions)
  },
  "difficulty": "easy" | "medium" | "hard",
  "assessmentComplete": false,
  "determinedLevel": null,
  "confidence": 0.0,
  "reasoning": "Brief explanation of why this question was chosen"
}

If you have enough data (3-5 questions), set assessmentComplete to true and provide determinedLevel and confidence (0.0-1.0).`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate assessment question ${questionIndex + 1} for a ${studentAge || 6}-year-old student.` }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI request failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse JSON from response (handle markdown code blocks)
    let parsed;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      parsed = JSON.parse(jsonMatch[1] || content);
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse assessment question");
    }

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Assessment generation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
