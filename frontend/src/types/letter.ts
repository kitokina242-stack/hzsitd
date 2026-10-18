import { UserRole } from './auth';

export type LetterDirection = 'INCOMING' | 'OUTGOING';

export type LetterPriority = 'Routine' | 'Urgent' | 'Confidential';

export type LetterStatus =
  | 'Draft'
  | 'Under Review'
  | 'Pending Department Head'
  | 'Approved'
  | 'Dispatched'
  | 'Completed'
  | 'Returned for Revision'
  | 'Archived'
  | 'Exception';

export type ApprovalStage =
  | 'Officer Draft'
  | 'Directory Lead Review'
  | 'Department Head Endorsement'
  | 'Completed';

export interface Letter {
  id: number;
  reference_no: string;
  tracking_token?: string;
  direction: LetterDirection;
  subject: string;
  body: string;
  priority: LetterPriority;
  letter_type: string;
  sender_type?: 'INTERNAL' | 'EXTERNAL';
  external_sender_name?: string;
  external_sender_org?: string;
  external_sender_ref?: string;
  sender_id?: number;
  sender_name?: string;
  sender_title?: string;
  sender_email?: string;
  sender_directory_id?: number;
  sender_dir_name?: string;
  sender_dir_short?: string;
  recipient_type?: 'INTERNAL' | 'EXTERNAL';
  recipient_directory_id?: number;
  recipient_dir_name?: string;
  recipient_dir_short?: string;
  assigned_officer_id?: number;
  assigned_officer_name?: string;
  assigned_officer_email?: string;
  external_recipient_name?: string;
  external_recipient_org?: string;
  external_recipient_address?: string;
  status: LetterStatus;
  approval_stage: ApprovalStage;
  digital_signature?: string;
  signature_type?: 'PROFILE' | 'DRAWN' | 'UPLOADED';
  stamp_data?: string;
  endorsed_by?: number;
  endorsed_by_name?: string;
  endorsed_by_title?: string;
  endorsed_at?: string;
  dispatched_at?: string;
  verification_hash?: string;
  created_by?: number;
  created_at: string;
  updated_at?: string;
  attachments?: LetterAttachment[];
  attachment_count?: number;
  has_pdf?: number | boolean;
}

export interface LetterAttachment {
  id: number;
  letter_id: number;
  filename: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  file_path: string;
  uploaded_by?: number;
  created_at?: string;
}

export interface LetterTimeline {
  id: number;
  letter_id: number;
  actor_id: number;
  actor_name: string;
  actor_role: UserRole;
  action: string;
  notes?: string;
  created_at: string;
}

export interface LetterComment {
  id: number;
  letter_id: number;
  author_id: number;
  author_name: string;
  author_role: UserRole;
  avatar_url?: string;
  comment_text: string;
  comment_type: 'Minute' | 'Instruction' | 'Revision Request' | 'Internal Note';
  created_at: string;
}

export interface DashboardStats {
  totalLetters: number;
  inboxCount: number;
  sentCount: number;
  pendingCount: number;
  urgentLetters: number;
  archivedLetters: number;
  userRole: UserRole;
  userName: string;
}
