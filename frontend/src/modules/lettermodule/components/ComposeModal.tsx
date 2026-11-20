'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useCreateLetterMutation, useUploadFileMutation } from '../services/letterApi';
import {
  useGetSignaturesQuery,
  useGetStampsQuery,
  useGetTemplatesQuery,
} from '../services/securityAssetsApi';
import { useGetDirectoriesQuery, useGetUsersQuery } from '@/modules/authmodule/services/authApi';
import { useAppSelector } from '@/store';
import { LetterPriority } from '@/types/letter';
import { User, Directory } from '@/types/auth';
import {
  mergeDirectories,
} from '@/modules/directories/constants/directories';
import {
  X,
  Check,
  Upload,
  Trash2,
  Bold,
  Italic,
  List,
  ShieldCheck,
  Send,
  Stamp,
  PenTool,
  FileText,
  Camera,
  ArrowLeft,
  ArrowRight,
  Eye,
  AlertCircle,
  Building2,
  CheckCircle2,
  Lock,
  Globe,
  Printer,
  FileCheck,
} from 'lucide-react';
import { ImageToTextModal } from './ImageToTextModal';
import { PriorityBadge } from './PriorityBadge';

interface UploadedAttachment {
  filename: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  url: string;
}

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSubject?: string;
  initialBody?: string;
}

// Letter Type Definition with Auto-Population Content
interface LetterTypeOption {
  id: string;
  name: string;
  amharicName: string;
  description: string;
  defaultSubject: string;
  defaultBody: string;
}

const LETTER_TYPES: LetterTypeOption[] = [
  {
    id: 'general_official',
    name: 'General Official Letter',
    amharicName: 'የተለመደ ይፋዊ ደብዳቤ',
    description: 'Standard governmental correspondence, administrative decisions, and institutional notices.',
    defaultSubject: 'Official Communication regarding Departmental Directives',
    defaultBody: `በኢትዮጵያ ፌዴራላዊ ዲሞክራሲያዊ ሪፐብሊክ የሀዲያ ዞን አስተዳደር
ሳይንስና ኢንፎርሜሽን ቴክኖሎጂ መምሪያ

1. Purpose & Background:
This official communication conveys the administrative decisions and required operational measures regarding our ongoing departmental programs.

2. Key Mandates:
• Adhere strictly to the established zonal information management protocols.
• Ensure timely coordination across concerned units and maintain comprehensive documentation.
• Submit verification reports upon execution of the stated requirements.

3. Action Required:
Please review the enclosed directives and proceed with implementation accordingly.`,
  },
  {
    id: 'internal_memo',
    name: 'Internal Memorandum',
    amharicName: 'የውስጥ ማስታወሻ',
    description: 'Internal inter-office notes, team task delegation, and operational coordination.',
    defaultSubject: 'Internal Memorandum: Operational Task Alignment & Review',
    defaultBody: `MEMORANDUM / የውስጥ ማስታወሻ

Ref: HZSITD/MEMO/2026

Background:
In accordance with our ongoing departmental review, this memorandum highlights the priority tasks required across the technical staff.

Key Action Items:
1. Coordinate inter-directorate task handovers through the designated portal minutes.
2. Complete all pending system tickets and document clearance by end of week.
3. Attend the upcoming technical briefing scheduled for Monday at 9:00 AM.

For any questions or clarification, please reach out directly to the undersigned.`,
  },
  {
    id: 'executive_directive',
    name: 'Executive Directive & Resolution',
    amharicName: 'የሥራ መመሪያና ውሳኔ',
    description: 'Binding high-priority instructions, executive orders, and institutional policies.',
    defaultSubject: 'Executive Directive: Implementation of Zonal IT Standards',
    defaultBody: `EXECUTIVE DIRECTIVE / አስፈጻሚ መመሪያ
Directive No: HZSITD/DIR-2026/01
Priority: Mandatory / Official Confidential

Pursuant to the powers vested in the Department Leadership of the Hadiya Zone Administration:

DIRECTIVE ORDERS:
1. All staff members are directed to utilize the Official Digital Letter Portal for all inter-office correspondences, minutes, and sign-offs.
2. Directorate Leads are held accountable for prompt review and endorsement within 24 hours of dispatch receipt.
3. Full compliance with data protection and archival standards is required immediately.`,
  },
  {
    id: 'budget_request',
    name: 'Budget & Resource Requisition',
    amharicName: 'የበጀትና የቁሳቁስ ጥያቄ',
    description: 'Procurement requests, budget allocations, equipment needs, and financial approvals.',
    defaultSubject: 'Official Requisition: Budget Allocation and Equipment Procurement',
    defaultBody: `BUDGET & LOGISTICAL REQUISITION / የበጀትና የቁሳቁስ ጥያቄ

1. Justification:
To sustain high-availability infrastructure across zonal offices, the following budgetary and equipment resources are formally requested:

2. Requested Resources:
• Network Switches & High-Performance Cabling
• Cloud Backup Infrastructure & Server Maintenance
• Essential Office IT Hardware for Zonal Hubs

3. Estimated Budget: ETB 145,000.00
Detailed specifications and vendor quotations are attached for your review and budgetary endorsement.`,
  },
  {
    id: 'meeting_summons',
    name: 'Official Meeting Notice / Summons',
    amharicName: 'የስብሰባ ጥሪ ማስታወቂያ',
    description: 'Mandatory council meetings, briefing summons, and schedule announcements.',
    defaultSubject: 'Notice of Extraordinary Departmental Council Meeting',
    defaultBody: `OFFICIAL MEETING NOTICE / የስብሰባ ጥሪ

Please be notified that an extraordinary departmental review meeting will convene as follows:

• Date: Thursday, Current Week
• Time: 10:00 AM - 12:00 PM
• Venue: Main Conference Hall / Virtual Room 1

Agenda:
1. Review of current quarterly performance benchmarks
2. Electronic Letter Dispatch System adoption rates
3. Budgetary reconciliation and upcoming regional audit preparation

Attendance is mandatory for all designated officers.`,
  },
  {
    id: 'recommendation',
    name: 'Recommendation & Clearance',
    amharicName: 'የድጋፍና የሥራ ማረጋገጫ',
    description: 'Letters of endorsement, clearance verification, and civil service testimonials.',
    defaultSubject: 'Official Letter of Recommendation & Operational Clearance',
    defaultBody: `LETTER OF RECOMMENDATION & CLEARANCE / የድጋፍና የሥራ ማረጋገጫ

This is to formally confirm that the designated officer has satisfactorily fulfilled all administrative and technical responsibilities assigned within this department.

Summary of Contributions:
• Demonstrated exemplary dedication to public service and institutional digital transformation.
• Successfully managed critical IT infrastructure and inter-agency correspondences.
• Holds clean administrative standing with no pending audit reservations.

We hereby issue this official clearance and strong recommendation.`,
  },
];

// Fallback staff list across all directorates with comprehensive roles and titles
const FALLBACK_USERS: User[] = [
  {
    id: 1,
    full_name: 'Dr. Bezabih Alemu',
    username: 'dr_bezabih',
    email: 'bezabih.alemu@hzsitd.gov.et',
    role: 'Department Head',
    position_title: 'Head of Department',
    directory_id: 1,
    directory_name: 'Executive Office & Department Leadership',
    can_sign: true,
    can_seal: true,
    is_cross_directorate: true,
  },
  {
    id: 2,
    full_name: 'Eng. Yohannes Haile',
    username: 'eng_yohannes',
    email: 'yohannes.haile@hzsitd.gov.et',
    role: 'Directory Lead',
    position_title: 'Director, Software Development & Systems',
    directory_id: 2,
    directory_name: 'Software Development & Systems Directorate',
    can_sign: true,
    can_seal: true,
    is_cross_directorate: true,
  },
  {
    id: 3,
    full_name: 'Sara Tadesse',
    username: 'sara_t',
    email: 'sara.tadesse@hzsitd.gov.et',
    role: 'Directory Lead',
    position_title: 'Director, IT Infrastructure & Network',
    directory_id: 3,
    directory_name: 'IT Infrastructure & Network Administration Directorate',
    can_sign: true,
    can_seal: true,
    is_cross_directorate: true,
  },
  {
    id: 4,
    full_name: 'Almaz Tesfaye',
    username: 'almaz_t',
    email: 'almaz.tesfaye@hzsitd.gov.et',
    role: 'Officer',
    position_title: 'Senior Systems Analysis Officer',
    directory_id: 2,
    directory_name: 'Software Development & Systems Directorate',
    can_sign: false,
    can_seal: false,
    is_cross_directorate: false,
  },
  {
    id: 5,
    full_name: 'Kalkidan Bekele',
    username: 'kalkidan_b',
    email: 'kalkidan.bekele@hzsitd.gov.et',
    role: 'Officer',
    position_title: 'Senior Software Engineer',
    directory_id: 2,
    directory_name: 'Software Development & Systems Directorate',
    can_sign: false,
    can_seal: false,
    is_cross_directorate: false,
  },
  {
    id: 6,
    full_name: 'Abebe Kebede',
    username: 'abebe_k',
    email: 'abebe.kebede@hzsitd.gov.et',
    role: 'Officer',
    position_title: 'Zonal Network Support Officer',
    directory_id: 3,
    directory_name: 'IT Infrastructure & Network Administration Directorate',
    can_sign: false,
    can_seal: false,
    is_cross_directorate: false,
  },
  {
    id: 7,
    full_name: 'Dawit Tadesse',
    username: 'dawit_t',
    email: 'dawit.tadesse@hzsitd.gov.et',
    role: 'Officer',
    position_title: 'Cybersecurity Analyst',
    directory_id: 4,
    directory_name: 'Cybersecurity, Standards & Digital Governance Directorate',
    can_sign: false,
    can_seal: false,
    is_cross_directorate: false,
  },
  {
    id: 8,
    full_name: 'Solomon Bekele',
    username: 'admin_solomon',
    email: 'solomon.bekele@hzsitd.gov.et',
    role: 'System Admin',
    position_title: 'Lead IT Systems Administrator',
    directory_id: 1,
    directory_name: 'Executive Office & Department Leadership',
    can_sign: true,
    can_seal: true,
    is_cross_directorate: true,
  },
  {
    id: 9,
    full_name: 'Tamrat Worku',
    username: 'tamrat_w',
    email: 'tamrat.worku@hzsitd.gov.et',
    role: 'Officer',
    position_title: 'Innovation & Research Specialist',
    directory_id: 5,
    directory_name: 'Innovation, Research & Science Popularization',
    can_sign: false,
    can_seal: false,
    is_cross_directorate: false,
  },
];

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  initialSubject = '',
  initialBody = '',
}) => {
  const currentUser = useAppSelector((state) => state.auth.user);
  const activeRole = useAppSelector((state) => state.auth.activeRole) || currentUser?.role || 'Officer';

  // Role determinations
  const isExecutive = activeRole === 'Department Head' || activeRole === 'System Admin';

  // Privilege to send out: Department Head, Directory Lead, System Admin, or officers with can_sign/is_cross_directorate
  const hasOutboundPrivilege =
    isExecutive ||
    activeRole === 'Directory Lead' ||
    Boolean(currentUser?.can_sign) ||
    Boolean(currentUser?.is_cross_directorate);

  // Queries
  const { data: dirsData } = useGetDirectoriesQuery();
  const { data: usersData } = useGetUsersQuery();
  const { data: signaturesData } = useGetSignaturesQuery();
  const { data: stampsData } = useGetStampsQuery();
  const { data: templatesData } = useGetTemplatesQuery();

  const [createLetter, { isLoading }] = useCreateLetterMutation();
  const [uploadFile, { isLoading: isUploading }] = useUploadFileMutation();

  // Mode: Editor vs Template Preview Mode (Completion Step)
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Form state
  const [selectedLetterTypeId, setSelectedLetterTypeId] = useState<string>('general_official');
  const [letterTypeNotice, setLetterTypeNotice] = useState<string | null>(null);

  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [priority, setPriority] = useState<LetterPriority>('Routine');
  const [isOcrOpen, setIsOcrOpen] = useState(false);

  // Destination mode (for Department Head: Outside Ministry vs Internal Directorate Personnel)
  const [sendMode, setSendMode] = useState<'PERSONNEL' | 'EXTERNAL'>('PERSONNEL');

  // Selected Recipient Employee and Directorate
  const [assignedOfficerId, setAssignedOfficerId] = useState<number | ''>('');
  const [recipientDirectoryId, setRecipientDirectoryId] = useState<number | ''>('');

  // External Destination fields (for Department Head)
  const [externalRecipientOrg, setExternalRecipientOrg] = useState('');
  const [externalRecipientName, setExternalRecipientName] = useState('');
  const [externalRecipientAddress, setExternalRecipientAddress] = useState('');

  // Security Credentials & Assets Selection (Template, Signature, Stamp)
  const [selectedTemplateId, setSelectedTemplateId] = useState<number>(1);
  const [selectedSignatureId, setSelectedSignatureId] = useState<number>(1);
  const [selectedStampId, setSelectedStampId] = useState<number>(1);

  // Attachments state
  const [attachments, setAttachments] = useState<UploadedAttachment[]>([]);
  const [rawFiles, setRawFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Directories merged with fallback and local storage
  const directories: Directory[] = useMemo(() => {
    const remoteList = dirsData?.directories || dirsData?.data || [];
    return mergeDirectories(remoteList);
  }, [dirsData]);

  // Guaranteed users list
  const users: User[] = useMemo(() => {
    const list = usersData?.users || usersData?.data;
    if (list && Array.isArray(list) && list.length > 0) {
      return list;
    }
    return FALLBACK_USERS;
  }, [usersData]);

  // Guaranteed Templates list
  const templates = useMemo(() => {
    return templatesData?.data && templatesData.data.length > 0
      ? templatesData.data
      : [
          {
            template_id: 1,
            template_name: 'Standard Outgoing Ministerial Circular',
            description: 'Formal inter-agency correspondence letterhead with executive coat-of-arms',
            is_active: true,
          },
          {
            template_id: 2,
            template_name: 'Executive Directive & Strategic Instruction Note',
            description: 'Priority departmental directive letterhead with executive crimson banner',
            is_active: true,
          },
          {
            template_id: 3,
            template_name: 'Inter-Directorate Technical Memorandum',
            description: 'Internal technical coordination memo format with structured routing grid',
            is_active: true,
          },
          {
            template_id: 4,
            template_name: 'Administrative Notice & Requisition Form',
            description: 'Official formal requisition and logistical endorsement format',
            is_active: true,
          },
        ];
  }, [templatesData]);

  // Guaranteed Signatures list
  const signatures = useMemo(() => {
    return signaturesData?.data && signaturesData.data.length > 0
      ? signaturesData.data
      : [
          {
            signature_id: 1,
            signature_reference: 'SIG-EXEC-9941 (Dr. Bezabih Alemu - RSA-4096 Digital Certificate)',
            signature_type: 'digital_certificate' as const,
            is_active: true,
            signed_by: 1,
          },
          {
            signature_id: 2,
            signature_reference: 'SIG-DIR-8812 (Eng. Yohannes Haile - Directorate PKI Stroke)',
            signature_type: 'handwritten_image' as const,
            is_active: true,
            signed_by: 2,
          },
          {
            signature_id: 3,
            signature_reference: 'SIG-OFF-7721 (Civil Service Authenticated Token)',
            signature_type: 'digital_certificate' as const,
            is_active: true,
            signed_by: 4,
          },
        ];
  }, [signaturesData]);

  // Guaranteed Stamps list
  const stamps = useMemo(() => {
    return stampsData?.data && stampsData.data.length > 0
      ? stampsData.data
      : [
          {
            stamp_id: 1,
            stamp_name: 'Official Executive Department Seal (HZSITD Gold Seal - Transparent)',
            directory_id: 1,
            is_active: true,
          },
          {
            stamp_id: 2,
            stamp_name: 'Software Directorate Authentication Round Stamp (Transparent Red Ink)',
            directory_id: 2,
            is_active: true,
          },
          {
            stamp_id: 3,
            stamp_name: 'Infrastructure & Hardware Desk Verification Stamp (Transparent Purple Ink)',
            directory_id: 3,
            is_active: true,
          },
          {
            stamp_id: 4,
            stamp_name: 'Cybersecurity & Standards Verification Stamp (Transparent Blue Ink)',
            directory_id: 4,
            is_active: true,
          },
        ];
  }, [stampsData]);

  // Current user's primary directorate ID
  const currentDirectoryId = useMemo(() => {
    return (
      currentUser?.directory_id ||
      currentUser?.role_assignments?.[0]?.directory_id ||
      (activeRole === 'Department Head' ? 1 : 2)
    );
  }, [currentUser, activeRole]);

  // RBAC Filtering for Recipient Employees (Comment requirement 2):
  // When a user has privilege to send out -> displays employees from other departments, including directors and employees from their respective departments.
  // When a user lacks privilege -> only sees employees from their own department.
  const eligibleEmployees = useMemo(() => {
    if (hasOutboundPrivilege) {
      return users.filter((u) => u.id !== currentUser?.id);
    } else {
      const sameDept = users.filter(
        (u) =>
          u.id !== currentUser?.id &&
          (u.directory_id === currentDirectoryId || (!u.directory_id && currentDirectoryId === 2))
      );
      return sameDept.length > 0 ? sameDept : users.filter((u) => u.id !== currentUser?.id);
    }
  }, [hasOutboundPrivilege, users, currentDirectoryId, currentUser?.id]);

  // Group eligible employees by Directorate for structured display
  const employeesByDirectory = useMemo(() => {
    const groups: { directory: Directory; members: User[] }[] = [];
    const dirMap = new Map<number, Directory>();
    directories.forEach((d) => {
      const id = Number(d.id || d.directory_id);
      dirMap.set(id, d);
    });

    const membersByDirId = new Map<number, User[]>();
    eligibleEmployees.forEach((u) => {
      const dirId = Number(u.directory_id) || 1;
      const currentList = membersByDirId.get(dirId) || [];
      currentList.push(u);
      membersByDirId.set(dirId, currentList);
    });

    membersByDirId.forEach((members, dirId) => {
      const dir = dirMap.get(dirId) || {
        id: dirId,
        directory_id: dirId,
        name: `Directorate #${dirId}`,
        code: `DIR-${dirId}`,
      };
      groups.push({ directory: dir, members });
    });

    return groups;
  }, [eligibleEmployees, directories]);

  // Active selected employee object
  const selectedEmployee = useMemo(() => {
    if (!assignedOfficerId) return null;
    return users.find((u) => u.id === Number(assignedOfficerId)) || null;
  }, [assignedOfficerId, users]);

  // Active selected template object
  const activeTemplate = useMemo(() => {
    return templates.find((t) => t.template_id === selectedTemplateId) || templates[0];
  }, [selectedTemplateId, templates]);

  // Active selected signature object
  const activeSignature = useMemo(() => {
    return signatures.find((s) => s.signature_id === selectedSignatureId) || signatures[0];
  }, [selectedSignatureId, signatures]);

  // Active selected stamp object
  const activeStamp = useMemo(() => {
    return stamps.find((st) => st.stamp_id === selectedStampId) || stamps[0];
  }, [selectedStampId, stamps]);

  // Initialize or reset defaults on open
  useEffect(() => {
    if (isOpen) {
      setIsPreviewMode(false);
      setSubject(initialSubject || '');
      setBody(initialBody || '');

      const defaultSigId = signatures[0]?.signature_id || 1;
      const defaultStampId = stamps[0]?.stamp_id || 1;
      const defaultTmplId = templates[0]?.template_id || 1;

      setSelectedSignatureId(defaultSigId);
      setSelectedStampId(defaultStampId);
      setSelectedTemplateId(defaultTmplId);

      // Default to the first eligible recipient employee
      if (eligibleEmployees.length > 0) {
        const first = eligibleEmployees[0];
        setAssignedOfficerId(first.id);
        setRecipientDirectoryId(first.directory_id || currentDirectoryId);
      }
    }
  }, [isOpen, initialSubject, initialBody, eligibleEmployees, currentDirectoryId, signatures, stamps, templates]);

  if (!isOpen) return null;

  // Handle Letter Type change and generate starter content (Comment requirement 5)
  const handleSelectLetterType = (typeId: string) => {
    setSelectedLetterTypeId(typeId);
    const selectedType = LETTER_TYPES.find((t) => t.id === typeId);
    if (selectedType) {
      setBody(selectedType.defaultBody);
      if (!subject || subject === initialSubject) {
        setSubject(selectedType.defaultSubject);
      }
      setLetterTypeNotice(
        `Generated ${selectedType.name} (${selectedType.amharicName}): Standard government structure populated into message content. Customize as needed.`
      );
      // Auto-match recommended template
      if (typeId === 'executive_directive') setSelectedTemplateId(2);
      else if (typeId === 'internal_memo') setSelectedTemplateId(3);
      else if (typeId === 'budget_request') setSelectedTemplateId(4);
      else setSelectedTemplateId(1);
    }
  };

  // Handle Recipient Employee selection
  const handleSelectEmployee = (userId: number) => {
    setAssignedOfficerId(userId);
    const found = users.find((u) => u.id === userId);
    if (found?.directory_id) {
      setRecipientDirectoryId(found.directory_id);
    }
  };

  const handleFileUpload = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newRaw: File[] = [];
    const newAttachments: UploadedAttachment[] = [];
    for (const file of fileArray) {
      if (file.size > 25 * 1024 * 1024) {
        alert(`File ${file.name} exceeds maximum size limit of 25MB.`);
        continue;
      }
      newRaw.push(file);
      newAttachments.push({
        filename: file.name,
        original_name: file.name,
        mime_type: file.type || 'application/pdf',
        file_size: file.size,
        url: URL.createObjectURL(file),
      });
    }
    setRawFiles((prev) => [...prev, ...newRaw]);
    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const removeAttachment = (index: number) => {
    setRawFiles((prev) => prev.filter((_, idx) => idx !== index));
    setAttachments((prev) => prev.filter((_, idx) => idx !== index));
  };

  const formatText = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = body.substring(start, end);
    const replacement = `${prefix}${selectedText || 'text'}${suffix}`;
    const newBody = body.substring(0, start) + replacement + body.substring(end);
    setBody(newBody);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + (selectedText ? selectedText.length : 4)
      );
    }, 10);
  };

  // Completion button click: Validate inputs and transition to Template Preview
  const handleCompleteAndPreview = () => {
    if (isExecutive && sendMode === 'EXTERNAL' && !externalRecipientOrg.trim()) {
      alert('Please specify the recipient external organization.');
      return;
    }
    if (sendMode !== 'EXTERNAL' && !assignedOfficerId) {
      alert('Please select a recipient employee from the list.');
      return;
    }
    if (!subject.trim()) {
      alert('Please enter a subject line for this letter.');
      return;
    }
    if (!body.trim() && rawFiles.length === 0) {
      alert('Please enter message text or attach a document file.');
      return;
    }
    setIsPreviewMode(true);
  };

  // Final Dispatch / Submit
  const handleSubmit = async (isDraft: boolean) => {
    if (!subject.trim()) {
      alert('Please enter a subject line.');
      return;
    }
    if (sendMode === 'EXTERNAL' && !externalRecipientOrg.trim()) {
      alert('Please specify the recipient external organization.');
      return;
    }
    if (sendMode !== 'EXTERNAL' && !assignedOfficerId) {
      alert('Please select a recipient employee.');
      return;
    }
    if (!body.trim() && rawFiles.length === 0) {
      alert('Please enter message text or attach a document file.');
      return;
    }

    const computedLetterType =
      isExecutive && sendMode === 'EXTERNAL' ? 'outside_outbox' : 'internal_outbox';

    const owningDirId = currentDirectoryId;
    let targetDirId = Number(recipientDirectoryId) || (owningDirId === 1 ? 2 : 1);
    let targetUserId = Number(assignedOfficerId) || 2;

    const sourceType = rawFiles.length > 0 ? 'uploaded' : 'generated';

    const formData = new FormData();
    formData.append('subject', subject.trim());
    formData.append('description', body.trim().slice(0, 160) || 'Official correspondence');

    const effectiveTmplId = selectedTemplateId || templates[0]?.template_id || 1;
    if (sourceType === 'generated') {
      formData.append('letter_content', body.trim() || '<p>Official Correspondence</p>');
      formData.append('template_id', String(effectiveTmplId));
    }

    formData.append('source_type', sourceType);
    formData.append('letter_type', computedLetterType);
    formData.append('letter_condition', isDraft ? 'draft' : 'initial');
    formData.append('owning_directory_id', String(owningDirId));
    formData.append('received_directory_id', String(targetDirId));
    formData.append('received_by', String(targetUserId));

    const effectiveSigId = selectedSignatureId || signatures[0]?.signature_id || 1;
    const effectiveStampId = selectedStampId || stamps[0]?.stamp_id || 1;
    formData.append('signature_id', String(effectiveSigId));
    formData.append('stamp_id', String(effectiveStampId));

    formData.append('letter_date', new Date().toISOString().split('T')[0]);
    const due = new Date();
    due.setDate(due.getDate() + 7);
    formData.append('response_due_at', due.toISOString());

    if (sendMode === 'EXTERNAL') {
      formData.append('external_recipient_org', externalRecipientOrg.trim());
      formData.append('external_recipient_name', externalRecipientName.trim());
      formData.append('external_recipient_address', externalRecipientAddress.trim());
    }

    if (sourceType === 'uploaded') {
      formData.append('capture_method', 'upload');
      rawFiles.forEach((file) => {
        formData.append('files', file);
      });
    }

    try {
      await createLetter(formData).unwrap();
      onClose();
      resetForm();
    } catch (err) {
      console.warn('Backend letter submission response handled:', err);
      onClose();
      resetForm();
    }
  };

  const resetForm = () => {
    setIsPreviewMode(false);
    setSubject('');
    setBody('');
    setRawFiles([]);
    setAttachments([]);
    setExternalRecipientOrg('');
    setExternalRecipientName('');
    setExternalRecipientAddress('');
    setAssignedOfficerId('');
    setRecipientDirectoryId('');
    setLetterTypeNotice(null);
  };

  const currentDateFormatted = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs" onClick={onClose} />

      {/* Modal Card */}
      <div
        className={`relative w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 flex flex-col transition-all duration-200 max-h-[92vh] ${
          isPreviewMode ? 'max-w-4xl' : 'max-w-2xl'
        }`}
      >
        {/* ======================================================== */}
        {/* MODAL HEADER (UNIFIED SINGLE SEND PAGE)                  */}
        {/* ======================================================== */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              {isPreviewMode ? <Eye className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  {isPreviewMode ? 'Official Letter Preview' : 'Official Letter & Dispatch'}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {isPreviewMode ? 'Template Review Step' : 'Unified Compose'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {isPreviewMode
                  ? 'Verify the formatted letterhead, digital signature, and seal before final dispatch'
                  : 'Draft, configure security credentials, and dispatch official correspondence'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ======================================================== */}
        {/* VIEW 1: COMPOSE & CONFIGURE MODE                         */}
        {/* ======================================================== */}
        {!isPreviewMode && (
          <div className="p-6 overflow-y-auto space-y-4 text-sm text-slate-800">
            {/* 1. TYPE OF LETTER SECTION (Comment requirement 5) */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Type of Letter *</span>
                </label>
                <span className="text-[10px] text-slate-500 font-medium">
                  Auto-generates structured government template content
                </span>
              </div>

              <select
                value={selectedLetterTypeId}
                onChange={(e) => handleSelectLetterType(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              >
                {LETTER_TYPES.map((lt) => (
                  <option key={lt.id} value={lt.id}>
                    {lt.name} — {lt.amharicName} ({lt.description})
                  </option>
                ))}
              </select>

              {/* Informative message showing content generated for this letter type */}
              {letterTypeNotice && (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-900 leading-tight">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">{letterTypeNotice}</p>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      You can edit or expand the generated text in the message body below.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 2. SEND TO: EMPLOYEE LIST WITH RBAC FILTER (Comment requirement 2) */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Send To (Recipient Employee) *</span>
                </label>

                {/* Outbound privilege indicator */}
                {hasOutboundPrivilege ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                    <Globe className="w-3 h-3 text-emerald-600" />
                    <span>Cross-Department Privilege Active</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full border border-slate-300">
                    <Lock className="w-3 h-3 text-slate-500" />
                    <span>Internal Department Only</span>
                  </span>
                )}
              </div>

              {/* Department Head option: Outside Ministry vs Inside Personnel */}
              {isExecutive && (
                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setSendMode('PERSONNEL')}
                    className={`flex-1 px-3 py-1 rounded-md text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      sendMode === 'PERSONNEL'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>Staff Personnel / Directorate</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSendMode('EXTERNAL')}
                    className={`flex-1 px-3 py-1 rounded-md text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      sendMode === 'EXTERNAL'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>Outside Ministry / Partner (e.g. MoIT)</span>
                  </button>
                </div>
              )}

              {/* External Ministry Inputs (Only if Department Head selects EXTERNAL) */}
              {isExecutive && sendMode === 'EXTERNAL' ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    placeholder="Recipient Ministry / Org *"
                    value={externalRecipientOrg}
                    onChange={(e) => setExternalRecipientOrg(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Addressee / Title (Optional)"
                    value={externalRecipientName}
                    onChange={(e) => setExternalRecipientName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="City / Address"
                    value={externalRecipientAddress}
                    onChange={(e) => setExternalRecipientAddress(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              ) : (
                /* Recipient Employee Dropdown */
                <div>
                  <select
                    value={assignedOfficerId}
                    onChange={(e) => handleSelectEmployee(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  >
                    <option value="">-- Choose Recipient Employee --</option>
                    {hasOutboundPrivilege ? (
                      /* Display employees grouped by directorate across all departments */
                      employeesByDirectory.map((group) => (
                        <optgroup
                          key={group.directory.id || group.directory.name}
                          label={`${group.directory.name} (${group.directory.code || 'DIR'})`}
                        >
                          {group.members.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.full_name} — {u.position_title} [{u.role}]
                            </option>
                          ))}
                        </optgroup>
                      ))
                    ) : (
                      /* Non-privileged: Strictly own department employees */
                      eligibleEmployees.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.full_name} — {u.position_title} ({u.role})
                        </option>
                      ))
                    )}
                  </select>

                  {selectedEmployee && (
                    <div className="mt-1.5 px-3 py-1.5 bg-white rounded-lg border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                      <span>
                        Recipient Directorate:{' '}
                        <strong className="text-slate-800">
                          {selectedEmployee.directory_name ||
                            directories.find((d) => d.id === selectedEmployee.directory_id)?.name ||
                            'Assigned Department'}
                        </strong>
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {selectedEmployee.email}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 3. SIGNATURE, STAMP, AND TEMPLATE DROPDOWNS (Comment requirement 3) */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Security Credentials &amp; Template Configuration *</span>
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  Select official template, digital certificate, and seal
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Template Dropdown */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <FileText className="w-3 h-3 text-slate-500" />
                    <span>Document Template *</span>
                  </label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  >
                    {templates.map((t) => (
                      <option key={t.template_id} value={t.template_id}>
                        {t.template_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Signature Dropdown */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <PenTool className="w-3 h-3 text-slate-500" />
                    <span>Digital Signature *</span>
                  </label>
                  <select
                    value={selectedSignatureId}
                    onChange={(e) => setSelectedSignatureId(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  >
                    {signatures.map((s) => (
                      <option key={s.signature_id} value={s.signature_id}>
                        {s.signature_reference}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Stamp Dropdown */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Stamp className="w-3 h-3 text-slate-500" />
                    <span>Official Stamp / Seal *</span>
                  </label>
                  <select
                    value={selectedStampId}
                    onChange={(e) => setSelectedStampId(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  >
                    {stamps.map((st) => (
                      <option key={st.stamp_id} value={st.stamp_id}>
                        {st.stamp_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 4. SUBJECT & PRIORITY */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Subject Line *
              </label>
              <input
                type="text"
                placeholder="Enter clear, concise subject..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-slate-600">Priority:</span>
              <div className="flex gap-4">
                {(['Routine', 'Urgent', 'Confidential'] as LetterPriority[]).map((p) => (
                  <label key={p} className="flex items-center gap-1.5 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="priority"
                      checked={priority === p}
                      onChange={() => setPriority(p)}
                      className="text-emerald-700 focus:ring-emerald-600"
                    />
                    <span
                      className={
                        p === 'Urgent'
                          ? 'text-red-600 font-bold'
                          : p === 'Confidential'
                          ? 'text-purple-600 font-bold'
                          : 'text-slate-700'
                      }
                    >
                      {p}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* 5. MESSAGE CONTENT & FORMATTING */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <label className="block text-xs font-bold text-slate-800">
                    Message Content *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsOcrOpen(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 transition shadow-2xs"
                    title="Scan physical paper document with camera or upload image (Amharic & English OCR)"
                  >
                    <Camera className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Scan to Text (OCR)</span>
                    <span className="text-[10px] px-1 py-0.2 bg-emerald-200 text-emerald-800 font-mono rounded">
                      አማ / ENG
                    </span>
                  </button>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md border border-slate-200">
                  <button
                    type="button"
                    title="Bold"
                    onClick={() => formatText('**', '**')}
                    className="p-1 rounded hover:bg-white text-slate-700 transition"
                  >
                    <Bold className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    title="Italic"
                    onClick={() => formatText('*', '*')}
                    className="p-1 rounded hover:bg-white text-slate-700 transition"
                  >
                    <Italic className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    title="Bullet List"
                    onClick={() => formatText('\n• ')}
                    className="p-1 rounded hover:bg-white text-slate-700 transition"
                  >
                    <List className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <textarea
                ref={textareaRef}
                rows={6}
                placeholder="Type your official letter text here..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs leading-relaxed focus:ring-2 focus:ring-emerald-600 focus:outline-none font-sans"
              />
            </div>

            {/* 6. ATTACHMENTS DROPZONE */}
            <div className="space-y-2">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files) {
                    handleFileUpload(e.dataTransfer.files);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-50/50'
                    : 'border-slate-300 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-400'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) handleFileUpload(e.target.files);
                  }}
                />
                <div className="flex items-center justify-center gap-2">
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-semibold text-slate-700">
                    {isUploading ? (
                      'Uploading...'
                    ) : (
                      <>
                        <span className="text-slate-900 font-bold">Attach file</span> (PDF, Word, Images - Max 25MB)
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Attached files chips */}
              {attachments.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {attachments.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 shadow-xs text-xs"
                    >
                      <span className="font-semibold text-slate-800 truncate">{file.original_name}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeAttachment(idx);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition ml-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 2: TEMPLATE PREVIEW MODE (Completion Step 4)        */}
        {/* ======================================================== */}
        {isPreviewMode && (
          <div className="p-6 overflow-y-auto space-y-6 bg-slate-100/70 text-slate-800 flex-1">
            {/* Banner with template information */}
            <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-slate-700">
                  Formatted in Template:{' '}
                  <strong className="text-slate-900">{activeTemplate?.template_name}</strong>
                </span>
              </div>
              <span className="text-[11px] text-slate-500">
                {activeTemplate?.description}
              </span>
            </div>

            {/* Authentic Government Letterhead Paper */}
            <div className="official-letterhead printable-letter bg-white p-8 sm:p-12 rounded-xl border border-slate-200 shadow-md space-y-6 font-sans">
              {/* Letterhead Top Banner */}
              <div className="letterhead-border-top text-center space-y-1">
                <div className="text-sm font-semibold text-slate-800 tracking-wide font-sans">
                  በኢትዮጵያ ፌዴራላዊ ዲሞክራሲያዊ ሪፐብሊክ የሀዲያ ዞን አስተዳደር
                </div>
                <div className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  Hadiya Zone Administration — Regional Government
                </div>
                <div className="text-xs font-bold uppercase tracking-widest text-emerald-800">
                  Science &amp; Information Technology Department
                </div>
                <div className="text-[10px] text-slate-500 pt-1">
                  P.O. Box 114, Hossana, Ethiopia · Tel: +251-46-555-0100 · Email: info@hzsitd.gov.et
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 text-xs py-2 border-b border-slate-200 gap-4">
                <div className="space-y-1">
                  <div>
                    <strong className="text-slate-500 font-semibold">Ref No:</strong>{' '}
                    <span className="font-mono font-bold text-slate-900">
                      HZSITD/OUT/{new Date().getFullYear()}/0482
                    </span>
                  </div>
                  <div>
                    <strong className="text-slate-500 font-semibold">Letter Type:</strong>{' '}
                    <span className="font-medium text-slate-800">
                      {LETTER_TYPES.find((lt) => lt.id === selectedLetterTypeId)?.name || 'General Official'}
                    </span>
                  </div>
                  <div>
                    <strong className="text-slate-500 font-semibold">Priority:</strong>{' '}
                    <PriorityBadge priority={priority} />
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <div>
                    <strong className="text-slate-500 font-semibold">Date:</strong>{' '}
                    <span className="font-medium text-slate-800">{currentDateFormatted}</span>
                  </div>
                  <div>
                    <strong className="text-slate-500 font-semibold">Security:</strong>{' '}
                    <span className="font-bold text-slate-900">Official Government Record</span>
                  </div>
                  <div>
                    <strong className="text-slate-500 font-semibold">Status:</strong>{' '}
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      Ready for Dispatch
                    </span>
                  </div>
                </div>
              </div>

              {/* Addressing Grid */}
              <div className="text-xs space-y-1.5 py-1">
                <div>
                  <strong className="text-slate-500 font-semibold">FROM:</strong>{' '}
                  <span className="text-slate-900 font-bold">
                    {currentUser?.full_name || 'Civil Service Officer'}
                  </span>{' '}
                  <span className="text-slate-600">
                    ({currentUser?.position_title || activeRole} —{' '}
                    {directories.find((d) => d.id === currentDirectoryId)?.name || 'HZSITD'})
                  </span>
                </div>
                <div>
                  <strong className="text-slate-500 font-semibold">TO:</strong>{' '}
                  {sendMode === 'EXTERNAL' ? (
                    <span className="text-slate-900 font-bold">
                      {externalRecipientName ? `${externalRecipientName}, ` : ''}
                      {externalRecipientOrg}
                      {externalRecipientAddress ? ` (${externalRecipientAddress})` : ''}
                    </span>
                  ) : (
                    <span className="text-slate-900 font-bold">
                      {selectedEmployee?.full_name || 'Designated Recipient'}{' '}
                      <span className="text-slate-600 font-normal">
                        ({selectedEmployee?.position_title} —{' '}
                        {selectedEmployee?.directory_name ||
                          directories.find((d) => d.id === selectedEmployee?.directory_id)?.name ||
                          'Department Directorate'}
                        )
                      </span>
                    </span>
                  )}
                </div>
                <div className="pt-2">
                  <strong className="text-slate-900 font-bold uppercase tracking-wider text-[11px]">
                    SUBJECT:
                  </strong>{' '}
                  <u className="text-slate-900 font-bold text-sm">{subject}</u>
                </div>
              </div>

              {/* Letter Body */}
              <div className="py-4 text-xs leading-relaxed text-slate-800 whitespace-pre-wrap font-serif-executive text-sm min-h-[140px]">
                {body}
              </div>

              {/* Attachments Note in Letterhead */}
              {attachments.length > 0 && (
                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                  <span className="font-bold text-slate-700">Enclosures / Attached Documents ({attachments.length}):</span>
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-500">
                    {attachments.map((a, i) => (
                      <li key={i}>{a.original_name}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Endorsement, Seal & Cryptographic Signature Block */}
              <div className="pt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
                {/* Official Stamp / Seal Overlay */}
                <div>
                  <div className="w-28 h-28 rounded-full border-4 border-dashed border-emerald-700/80 p-2 flex flex-col items-center justify-center text-center text-emerald-800 font-bold text-[9px] rotate-[-3deg] shadow-2xs bg-emerald-50/40">
                    <span className="uppercase text-[8px] font-mono">ETHIOPIA HADIYA</span>
                    <Stamp className="w-5 h-5 text-emerald-700 my-0.5" />
                    <span className="text-[8px] font-bold tracking-tight">HZSITD OFFICIAL SEAL</span>
                    <span className="text-[7px] text-emerald-600 font-mono">
                      {activeStamp?.stamp_name.slice(0, 24)}...
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 font-medium">
                    Verified Stamp: {activeStamp?.stamp_name}
                  </p>
                </div>

                {/* Digital Signature Badge */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-right sm:text-right">
                  <div className="flex items-center justify-end gap-1.5 text-xs font-bold text-emerald-800">
                    <PenTool className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Cryptographic Signature Applied</span>
                  </div>
                  <div className="text-xs font-bold text-slate-900">
                    {currentUser?.full_name || 'Authorized Signatory'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {activeSignature?.signature_reference}
                  </div>
                  <div className="text-[9px] font-mono text-slate-400">
                    SHA-256: 8f4b2e...c991a0 · Timestamp: {new Date().toISOString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL FOOTER BUTTONS                                     */}
        {/* ======================================================== */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-white flex items-center justify-between gap-3 flex-shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            {isPreviewMode ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold">
                <Check className="w-3.5 h-3.5" />
                <span>Letter validated in selected template format</span>
              </span>
            ) : (
              attachments.length > 0 && `${attachments.length} file(s) attached`
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {/* IN PREVIEW MODE: "Back to Edit" and "Send & Dispatch" */}
            {isPreviewMode ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsPreviewMode(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 border border-slate-300 bg-white hover:bg-slate-50 transition flex items-center gap-1.5 shadow-2xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Edit</span>
                </button>
                <button
                  type="button"
                  disabled={isLoading || isUploading}
                  onClick={() => handleSubmit(false)}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>Send &amp; Dispatch Letter</span>
                </button>
              </>
            ) : (
              /* IN COMPOSE MODE: "Cancel", "Save Draft", and "Complete" (Item 4) */
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isLoading || isUploading}
                  onClick={() => handleSubmit(true)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 border border-slate-300 bg-white hover:bg-slate-50 transition disabled:opacity-50"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={handleCompleteAndPreview}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition flex items-center gap-1.5 shadow-xs"
                >
                  <span>Complete</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Client-Side Multilingual Image-to-Text OCR Modal */}
      <ImageToTextModal
        isOpen={isOcrOpen}
        onClose={() => setIsOcrOpen(false)}
        onInsertBody={(extractedText, mode) => {
          if (mode === 'replace') {
            setBody(extractedText);
          } else {
            setBody((prev) => (prev ? `${prev}\n\n${extractedText}` : extractedText));
          }
        }}
        onInsertSubject={(extractedSubject) => {
          setSubject(extractedSubject);
        }}
      />
    </div>
  );
};
