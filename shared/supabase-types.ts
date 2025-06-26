export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      activities: {
        Row: {
          client_id: number | null
          created_at: string
          description: string | null
          id: number
          metadata: Json
          project_id: number | null
          title: string
          type: string
        }
        Insert: {
          client_id?: number | null
          created_at?: string
          description?: string | null
          id?: number
          metadata?: Json
          project_id?: number | null
          title: string
          type: string
        }
        Update: {
          client_id?: number | null
          created_at?: string
          description?: string | null
          id?: number
          metadata?: Json
          project_id?: number | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      assets: {
        Row: {
          created_at: string
          folder: string
          id: number
          metadata: Json
          mime_type: string
          name: string
          original_name: string
          owner_id: number
          project_id: number | null
          size: number
          tags: Json
          thumbnail_url: string | null
          type: string
          uploaded_by: number
          url: string
        }
        Insert: {
          created_at?: string
          folder?: string
          id?: number
          metadata?: Json
          mime_type: string
          name: string
          original_name: string
          owner_id: number
          project_id?: number | null
          size: number
          tags?: Json
          thumbnail_url?: string | null
          type: string
          uploaded_by: number
          url: string
        }
        Update: {
          created_at?: string
          folder?: string
          id?: number
          metadata?: Json
          mime_type?: string
          name?: string
          original_name?: string
          owner_id?: number
          project_id?: number | null
          size?: number
          tags?: Json
          thumbnail_url?: string | null
          type?: string
          uploaded_by?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      clients: {
        Row: {
          avatar: string | null
          created_by: number
          email: string
          id: number
          joined_at: string
          name: string
          notes: string | null
        }
        Insert: {
          avatar?: string | null
          created_by: number
          email: string
          id?: number
          joined_at?: string
          name: string
          notes?: string | null
        }
        Update: {
          avatar?: string | null
          created_by?: number
          email?: string
          id?: number
          joined_at?: string
          name?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      design_comments: {
        Row: {
          attachments: Json
          author_id: number
          author_type: string
          content: string
          created_at: string
          design_id: number
          id: number
          parent_id: number | null
          position: Json | null
          priority: string
          resolved_at: string | null
          resolved_by: number | null
          status: string
          updated_at: string
        }
        Insert: {
          attachments?: Json
          author_id: number
          author_type: string
          content: string
          created_at?: string
          design_id: number
          id?: number
          parent_id?: number | null
          position?: Json | null
          priority?: string
          resolved_at?: string | null
          resolved_by?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          attachments?: Json
          author_id?: number
          author_type?: string
          content?: string
          created_at?: string
          design_id?: number
          id?: number
          parent_id?: number | null
          position?: Json | null
          priority?: string
          resolved_at?: string | null
          resolved_by?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_comments_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "project_designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "design_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_comments_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      direct_messages: {
        Row: {
          client_id: number
          content: string
          id: number
          is_read: boolean
          sender_id: number
          sender_type: string
          sent_at: string
        }
        Insert: {
          client_id: number
          content: string
          id?: number
          is_read?: boolean
          sender_id: number
          sender_type: string
          sent_at?: string
        }
        Update: {
          client_id?: number
          content?: string
          id?: number
          is_read?: boolean
          sender_id?: number
          sender_type?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      documents: {
        Row: {
          id: number
          name: string
          project_id: number
          size: number | null
          type: string
          uploaded_at: string
          uploaded_by: number | null
          url: string
        }
        Insert: {
          id?: number
          name: string
          project_id: number
          size?: number | null
          type: string
          uploaded_at?: string
          uploaded_by?: number | null
          url: string
        }
        Update: {
          id?: number
          name?: string
          project_id?: number
          size?: number | null
          type?: string
          uploaded_at?: string
          uploaded_by?: number | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      form_submissions: {
        Row: {
          client_id: number
          form_id: number
          id: number
          is_completed: boolean
          project_id: number
          responses: Json
          reviewed_at: string | null
          reviewed_by: number | null
          submitted_at: string
        }
        Insert: {
          client_id: number
          form_id: number
          id?: number
          is_completed?: boolean
          project_id: number
          responses: Json
          reviewed_at?: string | null
          reviewed_by?: number | null
          submitted_at?: string
        }
        Update: {
          client_id?: number
          form_id?: number
          id?: number
          is_completed?: boolean
          project_id?: number
          responses?: Json
          reviewed_at?: string | null
          reviewed_by?: number | null
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "onboarding_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      messages: {
        Row: {
          content: string
          id: number
          is_read: boolean
          project_id: number
          sender_id: number
          sender_type: string
          sent_at: string
        }
        Insert: {
          content: string
          id?: number
          is_read?: boolean
          project_id: number
          sender_id: number
          sender_type: string
          sent_at?: string
        }
        Update: {
          content?: string
          id?: number
          is_read?: boolean
          project_id?: number
          sender_id?: number
          sender_type?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      milestones: {
        Row: {
          completed_at: string | null
          description: string | null
          due_date: string | null
          id: number
          order_index: number
          project_id: number
          status: string
          title: string
        }
        Insert: {
          completed_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: number
          order_index?: number
          project_id: number
          status?: string
          title: string
        }
        Update: {
          completed_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: number
          order_index?: number
          project_id?: number
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          data: Json
          id: number
          is_read: boolean
          message: string
          read_at: string | null
          title: string
          type: string
          user_id: number
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          data?: Json
          id?: number
          is_read?: boolean
          message: string
          read_at?: string | null
          title: string
          type: string
          user_id: number
        }
        Update: {
          action_url?: string | null
          created_at?: string
          data?: Json
          id?: number
          is_read?: boolean
          message?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      onboarding_forms: {
        Row: {
          created_at: string
          created_by: number
          description: string | null
          fields: Json
          id: number
          is_active: boolean
          is_template: boolean
          owner_id: number
          project_id: number | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: number
          description?: string | null
          fields: Json
          id?: number
          is_active?: boolean
          is_template?: boolean
          owner_id: number
          project_id?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: number
          description?: string | null
          fields?: Json
          id?: number
          is_active?: boolean
          is_template?: boolean
          owner_id?: number
          project_id?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_forms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_forms_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_forms_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      project_comments: {
        Row: {
          attachments: Json
          author_id: number
          author_type: string
          content: string
          created_at: string
          id: number
          mentions: Json
          parent_id: number | null
          priority: string
          project_id: number
          resolved_at: string | null
          resolved_by: number | null
          status: string
          tags: Json
          updated_at: string
        }
        Insert: {
          attachments?: Json
          author_id: number
          author_type: string
          content: string
          created_at?: string
          id?: number
          mentions?: Json
          parent_id?: number | null
          priority?: string
          project_id: number
          resolved_at?: string | null
          resolved_by?: number | null
          status?: string
          tags?: Json
          updated_at?: string
        }
        Update: {
          attachments?: Json
          author_id?: number
          author_type?: string
          content?: string
          created_at?: string
          id?: number
          mentions?: Json
          parent_id?: number | null
          priority?: string
          project_id?: number
          resolved_at?: string | null
          resolved_by?: number | null
          status?: string
          tags?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "project_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_comments_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      project_designs: {
        Row: {
          created_at: string
          description: string | null
          id: number
          image_url: string
          original_url: string | null
          project_id: number
          status: string
          thumbnail_url: string | null
          title: string
          type: string
          updated_at: string
          uploaded_by: number
          version: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: number
          image_url: string
          original_url?: string | null
          project_id: number
          status?: string
          thumbnail_url?: string | null
          title: string
          type: string
          updated_at?: string
          uploaded_by: number
          version?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: number
          image_url?: string
          original_url?: string | null
          project_id?: number
          status?: string
          thumbnail_url?: string | null
          title?: string
          type?: string
          updated_at?: string
          uploaded_by?: number
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_designs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_designs_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      project_tasks: {
        Row: {
          actual_hours: number | null
          assigned_to: number | null
          checklist: Json
          completed_at: string | null
          created_at: string
          created_by: number
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          id: number
          labels: Json
          position: number
          priority: string
          project_id: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          actual_hours?: number | null
          assigned_to?: number | null
          checklist?: Json
          completed_at?: string | null
          created_at?: string
          created_by: number
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: number
          labels?: Json
          position?: number
          priority?: string
          project_id: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          actual_hours?: number | null
          assigned_to?: number | null
          checklist?: Json
          completed_at?: string | null
          created_at?: string
          created_by?: number
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: number
          labels?: Json
          position?: number
          priority?: string
          project_id?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      project_team_members: {
        Row: {
          assigned_at: string
          assigned_by: number
          id: number
          is_active: boolean
          permissions: Json
          project_id: number
          role: string
          user_id: number
        }
        Insert: {
          assigned_at?: string
          assigned_by: number
          id?: number
          is_active?: boolean
          permissions?: Json
          project_id: number
          role: string
          user_id: number
        }
        Update: {
          assigned_at?: string
          assigned_by?: number
          id?: number
          is_active?: boolean
          permissions?: Json
          project_id?: number
          role?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_team_members_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_team_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      projects: {
        Row: {
          budget: number
          budget_used: number
          client_id: number
          created_at: string
          created_by: number
          description: string | null
          end_date: string | null
          id: number
          image: string | null
          owner_id: number
          priority: string
          progress: number
          start_date: string
          status: string
          tags: Json
          team_members: Json
          title: string
          updated_at: string
        }
        Insert: {
          budget: number
          budget_used?: number
          client_id: number
          created_at?: string
          created_by: number
          description?: string | null
          end_date?: string | null
          id?: number
          image?: string | null
          owner_id: number
          priority?: string
          progress?: number
          start_date?: string
          status?: string
          tags?: Json
          team_members?: Json
          title: string
          updated_at?: string
        }
        Update: {
          budget?: number
          budget_used?: number
          client_id?: number
          created_at?: string
          created_by?: number
          description?: string | null
          end_date?: string | null
          id?: number
          image?: string | null
          owner_id?: number
          priority?: string
          progress?: number
          start_date?: string
          status?: string
          tags?: Json
          team_members?: Json
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      support_ticket_messages: {
        Row: {
          attachments: Json
          content: string
          created_at: string
          id: number
          is_internal: boolean
          sender_id: number
          sender_type: string
          ticket_id: number
        }
        Insert: {
          attachments?: Json
          content: string
          created_at?: string
          id?: number
          is_internal?: boolean
          sender_id: number
          sender_type: string
          ticket_id: number
        }
        Update: {
          attachments?: Json
          content?: string
          created_at?: string
          id?: number
          is_internal?: boolean
          sender_id?: number
          sender_type?: string
          ticket_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          }
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: number | null
          attachments: Json
          category: string
          created_at: string
          description: string
          id: number
          priority: string
          resolved_at: string | null
          status: string
          title: string
          updated_at: string
          user_id: number
        }
        Insert: {
          assigned_to?: number | null
          attachments?: Json
          category: string
          created_at?: string
          description: string
          id?: number
          priority?: string
          resolved_at?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: number
        }
        Update: {
          assigned_to?: number | null
          attachments?: Json
          category?: string
          created_at?: string
          description?: string
          id?: number
          priority?: string
          resolved_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      team_direct_messages: {
        Row: {
          content: string
          id: number
          is_read: boolean
          receiver_id: number
          sender_id: number
          sender_type: string
          sent_at: string
        }
        Insert: {
          content: string
          id?: number
          is_read?: boolean
          receiver_id: number
          sender_id: number
          sender_type: string
          sent_at?: string
        }
        Update: {
          content?: string
          id?: number
          is_read?: boolean
          receiver_id?: number
          sender_id?: number
          sender_type?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_direct_messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_direct_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_collaborations: {
        Row: {
          collaborator_id: number
          created_at: string
          id: number
          permissions: Json
          role: string
          status: string
          user_id: number
        }
        Insert: {
          collaborator_id: number
          created_at?: string
          id?: number
          permissions?: Json
          role: string
          status?: string
          user_id: number
        }
        Update: {
          collaborator_id?: number
          created_at?: string
          id?: number
          permissions?: Json
          role?: string
          status?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_collaborations_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_collaborations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: number
          invited_by: number
          name: string
          project_id: number | null
          role: string
          specialization: string | null
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: number
          invited_by: number
          name: string
          project_id?: number | null
          role: string
          specialization?: string | null
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: number
          invited_by?: number
          name?: string
          project_id?: number | null
          role?: string
          specialization?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_invitations_project"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      users: {
        Row: {
          avatar: string | null
          company_name: string | null
          company_role: string | null
          company_size: string | null
          created_at: string
          email: string
          id: number
          industry: string | null
          is_active: boolean
          last_login_at: string | null
          max_projects: number
          name: string
          specialization: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_plan: string
          subscription_status: string
          supabase_id: string | null
          username: string | null
        }
        Insert: {
          avatar?: string | null
          company_name?: string | null
          company_role?: string | null
          company_size?: string | null
          created_at?: string
          email: string
          id?: number
          industry?: string | null
          is_active?: boolean
          last_login_at?: string | null
          max_projects?: number
          name: string
          specialization?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_plan?: string
          subscription_status?: string
          supabase_id?: string | null
          username?: string | null
        }
        Update: {
          avatar?: string | null
          company_name?: string | null
          company_role?: string | null
          company_size?: string | null
          created_at?: string
          email?: string
          id?: number
          industry?: string | null
          is_active?: boolean
          last_login_at?: string | null
          max_projects?: number
          name?: string
          specialization?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_plan?: string
          subscription_status?: string
          supabase_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}