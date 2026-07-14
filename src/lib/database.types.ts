export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type BlockCategory = "deep" | "shallow" | "admin" | "personal" | "break";
export type BlockLane = "plan" | "revised";
export type BlockStatus = "planned" | "done" | "skipped";
export type TaskStatus = "inbox" | "done" | "archived";

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      settings: Table<
        {
          user_id: string;
          timezone: string;
          day_start_min: number;
          day_end_min: number;
          preferences: Json;
        },
        {
          user_id: string;
          timezone?: string;
          day_start_min?: number;
          day_end_min?: number;
          preferences?: Json;
        },
        Partial<{
          timezone: string;
          day_start_min: number;
          day_end_min: number;
          preferences: Json;
        }>
      >;
      days: Table<
        {
          id: string;
          user_id: string;
          date: string;
          notes: string | null;
          shutdown_complete: boolean;
        },
        {
          id?: string;
          user_id: string;
          date: string;
          notes?: string | null;
          shutdown_complete?: boolean;
        },
        Partial<{
          notes: string | null;
          shutdown_complete: boolean;
        }>
      >;
      blocks: Table<
        {
          id: string;
          user_id: string;
          day_id: string;
          lane: BlockLane;
          start_min: number;
          end_min: number;
          label: string;
          category: BlockCategory;
          status: BlockStatus;
          color: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id: string;
          day_id: string;
          lane?: BlockLane;
          start_min: number;
          end_min: number;
          label: string;
          category?: BlockCategory;
          status?: BlockStatus;
          color?: string | null;
        },
        Partial<{
          lane: BlockLane;
          start_min: number;
          end_min: number;
          label: string;
          category: BlockCategory;
          status: BlockStatus;
          color: string | null;
        }>
      >;
      tasks: Table<
        {
          id: string;
          user_id: string;
          day_id: string | null;
          title: string;
          notes: string | null;
          status: TaskStatus;
          position: number;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id: string;
          day_id?: string | null;
          title: string;
          notes?: string | null;
          status?: TaskStatus;
          position?: number;
        },
        Partial<{
          day_id: string | null;
          title: string;
          notes: string | null;
          status: TaskStatus;
          position: number;
        }>
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Block = Database["public"]["Tables"]["blocks"]["Row"];
export type Day = Database["public"]["Tables"]["days"]["Row"];
export type Setting = Database["public"]["Tables"]["settings"]["Row"];
export type Task = Database["public"]["Tables"]["tasks"]["Row"];
