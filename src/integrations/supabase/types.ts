export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      daily_reports: {
        Row: {
          clicked_dashboard: boolean | null
          days_to_close_gaps: number | null
          id: string
          improvements: Json | null
          needs_help: boolean | null
          next_focus: Json | null
          opened_at: string | null
          report_date: string | null
          report_html: string | null
          sent_at: string | null
          session_id: string | null
          shaky_areas: Json | null
          student_id: string
        }
        Insert: {
          clicked_dashboard?: boolean | null
          days_to_close_gaps?: number | null
          id?: string
          improvements?: Json | null
          needs_help?: boolean | null
          next_focus?: Json | null
          opened_at?: string | null
          report_date?: string | null
          report_html?: string | null
          sent_at?: string | null
          session_id?: string | null
          shaky_areas?: Json | null
          student_id: string
        }
        Update: {
          clicked_dashboard?: boolean | null
          days_to_close_gaps?: number | null
          id?: string
          improvements?: Json | null
          needs_help?: boolean | null
          next_focus?: Json | null
          opened_at?: string | null
          report_date?: string | null
          report_html?: string | null
          sent_at?: string | null
          session_id?: string | null
          shaky_areas?: Json | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_reports_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "practice_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_reports_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostic_attempts: {
        Row: {
          attempt_number: number | null
          correct_answer: Json
          diagnostic_id: string
          id: string
          is_correct: boolean | null
          question_data: Json
          student_answer: Json | null
          task_id: string
          time_taken_seconds: number | null
          timestamp: string | null
        }
        Insert: {
          attempt_number?: number | null
          correct_answer: Json
          diagnostic_id: string
          id?: string
          is_correct?: boolean | null
          question_data: Json
          student_answer?: Json | null
          task_id: string
          time_taken_seconds?: number | null
          timestamp?: string | null
        }
        Update: {
          attempt_number?: number | null
          correct_answer?: Json
          diagnostic_id?: string
          id?: string
          is_correct?: boolean | null
          question_data?: Json
          student_answer?: Json | null
          task_id?: string
          time_taken_seconds?: number | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_attempts_diagnostic_id_fkey"
            columns: ["diagnostic_id"]
            isOneToOne: false
            referencedRelation: "diagnostics"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostics: {
        Row: {
          completed_at: string | null
          gaps_identified: Json | null
          id: string
          level: Database["public"]["Enums"]["diagnostic_level"]
          needs_extra_support: boolean | null
          repair_attempts: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["diagnostic_status"] | null
          strengths: Json | null
          student_id: string
          time_taken_seconds: number | null
          total_correct: number | null
          total_questions: number | null
        }
        Insert: {
          completed_at?: string | null
          gaps_identified?: Json | null
          id?: string
          level: Database["public"]["Enums"]["diagnostic_level"]
          needs_extra_support?: boolean | null
          repair_attempts?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["diagnostic_status"] | null
          strengths?: Json | null
          student_id: string
          time_taken_seconds?: number | null
          total_correct?: number | null
          total_questions?: number | null
        }
        Update: {
          completed_at?: string | null
          gaps_identified?: Json | null
          id?: string
          level?: Database["public"]["Enums"]["diagnostic_level"]
          needs_extra_support?: boolean | null
          repair_attempts?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["diagnostic_status"] | null
          strengths?: Json | null
          student_id?: string
          time_taken_seconds?: number | null
          total_correct?: number | null
          total_questions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "diagnostics_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      level_assessments: {
        Row: {
          assessment_type: string
          completed_at: string | null
          confidence_score: number | null
          created_at: string
          determined_level: string | null
          id: string
          questions_asked: Json
          responses: Json
          student_id: string
        }
        Insert: {
          assessment_type?: string
          completed_at?: string | null
          confidence_score?: number | null
          created_at?: string
          determined_level?: string | null
          id?: string
          questions_asked?: Json
          responses?: Json
          student_id: string
        }
        Update: {
          assessment_type?: string
          completed_at?: string | null
          confidence_score?: number | null
          created_at?: string
          determined_level?: string | null
          id?: string
          questions_asked?: Json
          responses?: Json
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "level_assessments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_sessions: {
        Row: {
          completed_at: string | null
          completion_rate: number | null
          confidence_scores: Json | null
          duration_seconds: number | null
          hints_requested: number | null
          id: string
          reflection_emoji: string | null
          reflection_text: string | null
          session_date: string | null
          session_number: number | null
          started_at: string | null
          stretch_questions: Json | null
          student_id: string
          total_attempts: number | null
          warmup_questions: Json | null
        }
        Insert: {
          completed_at?: string | null
          completion_rate?: number | null
          confidence_scores?: Json | null
          duration_seconds?: number | null
          hints_requested?: number | null
          id?: string
          reflection_emoji?: string | null
          reflection_text?: string | null
          session_date?: string | null
          session_number?: number | null
          started_at?: string | null
          stretch_questions?: Json | null
          student_id: string
          total_attempts?: number | null
          warmup_questions?: Json | null
        }
        Update: {
          completed_at?: string | null
          completion_rate?: number | null
          confidence_scores?: Json | null
          duration_seconds?: number | null
          hints_requested?: number | null
          id?: string
          reflection_emoji?: string | null
          reflection_text?: string | null
          session_date?: string | null
          session_number?: number | null
          started_at?: string | null
          stretch_questions?: Json | null
          student_id?: string
          total_attempts?: number | null
          warmup_questions?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "practice_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      question_bank: {
        Row: {
          common_mistake: string | null
          correct_answer: Json
          created_at: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          hint: string | null
          id: string
          options: Json | null
          question_data: Json
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          topic: string
          usage_count: number | null
          worked_example: string | null
        }
        Insert: {
          common_mistake?: string | null
          correct_answer: Json
          created_at?: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          hint?: string | null
          id: string
          options?: Json | null
          question_data: Json
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          topic: string
          usage_count?: number | null
          worked_example?: string | null
        }
        Update: {
          common_mistake?: string | null
          correct_answer?: Json
          created_at?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          hint?: string | null
          id?: string
          options?: Json | null
          question_data?: Json
          question_text?: string
          question_type?: Database["public"]["Enums"]["question_type"]
          topic?: string
          usage_count?: number | null
          worked_example?: string | null
        }
        Relationships: []
      }
      student_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          day_number: number
          id: string
          questions_completed: Json | null
          questions_correct: number | null
          questions_total: number | null
          session_date: string
          student_id: string
          time_spent_seconds: number | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          day_number: number
          id?: string
          questions_completed?: Json | null
          questions_correct?: number | null
          questions_total?: number | null
          session_date?: string
          student_id: string
          time_spent_seconds?: number | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          day_number?: number
          id?: string
          questions_completed?: Json | null
          questions_correct?: number | null
          questions_total?: number | null
          session_date?: string
          student_id?: string
          time_spent_seconds?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          age: number | null
          cohort: string | null
          created_at: string | null
          current_level: Database["public"]["Enums"]["diagnostic_level"] | null
          diagnostic_completed_at: string | null
          id: string
          name: string
          parent_email: string
          parent_name: string | null
          user_id: string | null
        }
        Insert: {
          age?: number | null
          cohort?: string | null
          created_at?: string | null
          current_level?: Database["public"]["Enums"]["diagnostic_level"] | null
          diagnostic_completed_at?: string | null
          id?: string
          name: string
          parent_email: string
          parent_name?: string | null
          user_id?: string | null
        }
        Update: {
          age?: number | null
          cohort?: string | null
          created_at?: string | null
          current_level?: Database["public"]["Enums"]["diagnostic_level"] | null
          diagnostic_completed_at?: string | null
          id?: string
          name?: string
          parent_email?: string
          parent_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      tts_usage: {
        Row: {
          character_count: number
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          character_count?: number
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          character_count?: number
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      voice_feedback_log: {
        Row: {
          created_at: string
          emotion: string | null
          feedback_type: string
          id: string
          message_text: string
          session_id: string | null
          student_id: string
        }
        Insert: {
          created_at?: string
          emotion?: string | null
          feedback_type: string
          id?: string
          message_text: string
          session_id?: string | null
          student_id: string
        }
        Update: {
          created_at?: string
          emotion?: string | null
          feedback_type?: string
          id?: string
          message_text?: string
          session_id?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_feedback_log_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      question_bank_safe: {
        Row: {
          created_at: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"] | null
          id: string | null
          options: Json | null
          question_data: Json | null
          question_text: string | null
          question_type: Database["public"]["Enums"]["question_type"] | null
          topic: string | null
          usage_count: number | null
        }
        Insert: {
          created_at?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"] | null
          id?: string | null
          options?: Json | null
          question_data?: Json | null
          question_text?: string | null
          question_type?: Database["public"]["Enums"]["question_type"] | null
          topic?: string | null
          usage_count?: number | null
        }
        Update: {
          created_at?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"] | null
          id?: string | null
          options?: Json | null
          question_data?: Json | null
          question_text?: string | null
          question_type?: Database["public"]["Enums"]["question_type"] | null
          topic?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_tts_rate_limit: { Args: { p_user_id: string }; Returns: number }
      cleanup_old_tts_usage: { Args: never; Returns: undefined }
      is_email_allowlisted: { Args: { p_email: string }; Returns: boolean }
      log_tts_usage: {
        Args: { p_character_count: number; p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      diagnostic_level: "level_1" | "level_2"
      diagnostic_status: "in_progress" | "completed" | "needs_repair"
      difficulty_level: "foundation" | "core" | "challenge"
      question_type:
        | "multiple_choice"
        | "tap_count"
        | "drag_drop"
        | "fill_blank"
        | "word_problem"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      diagnostic_level: ["level_1", "level_2"],
      diagnostic_status: ["in_progress", "completed", "needs_repair"],
      difficulty_level: ["foundation", "core", "challenge"],
      question_type: [
        "multiple_choice",
        "tap_count",
        "drag_drop",
        "fill_blank",
        "word_problem",
      ],
    },
  },
} as const
