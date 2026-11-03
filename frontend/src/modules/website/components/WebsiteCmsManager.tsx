'use client';

import React, { useState } from 'react';
import { Globe, Megaphone, HelpCircle, Inbox, Plus, ArrowLeft, Check, CheckCircle2, AlertCircle, Trash2, X, Archive, Send } from 'lucide-react';
import {
  Announcement,
  FaqItem,
  ContactInquiry,
  useGetAnnouncementsQuery,
  useCreateAnnouncementMutation,
  usePublishAnnouncementMutation,
  useArchiveAnnouncementMutation,
  useGetFaqsQuery,
  useCreateFaqMutation,
  useDeleteFaqMutation,
  useGetContactInquiriesQuery,
  useResolveContactInquiryMutation,
} from '../services/websiteCmsApi';

interface WebsiteCmsManagerProps {
  onBackToDashboard: () => void;
}

const DEFAULT_ANNOUNCEMENTS: Announcement[] = [
  {
    announcement_id: 1,
    title: 'Public Launch of Official Electronic Letter Management Portal',
    content: 'The Hadiya Zone Science & IT Department has inaugurated the centralized digital correspondence portal across all zonal woredas and city administrations.',
    status: 'published',
    published_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    announcement_id: 2,
    title: 'Public Service Notice: Scheduled Fiber Backbone Maintenance',
    content: 'Zonal core network upgrading will occur this weekend from 2:00 AM to 6:00 AM with minimal service interruption expected.',
    status: 'published',
    published_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 6).toISOString()
  }
];

const DEFAULT_FAQS: FaqItem[] = [
  {
    faq_id: 1,
    category: 'Portal Access',
    question: 'How do civil servants access the electronic letter portal?',
    answer: 'Authorized staff can register with their official employee number and sign in after directory clearance is activated by a System Administrator.',
    is_published: true,
    created_at: new Date().toISOString()
  },
  {
    faq_id: 2,
    category: 'Letter Tracking',
    question: 'How are official letters verified by the public or external offices?',
    answer: 'Every official document contains a cryptographic QR code and tracking number that can be validated at the /verify portal.',
    is_published: true,
    created_at: new Date().toISOString()
  }
];

const DEFAULT_INQUIRIES: ContactInquiry[] = [
  {
    inquiry_id: 1,
    sender_name: 'Meron Alemu',
    sender_email: 'meron.alemu@hosanna.gov.et',
    subject: 'Request for Woreda IT Infrastructure Assessment',
    message: 'We are requesting technical support to evaluate the LAN setup at the Lemo Woreda administrative offices.',
    inquiry_status: 'new',
    submitted_at: new Date(Date.now() - 3600000 * 4).toISOString()
  },
  {
    inquiry_id: 2,
    sender_name: 'Kassahun Tadesse',
    sender_email: 'kassahun.t@yahoo.com',
    subject: 'Inquiry regarding digital literacy workshop dates',
    message: 'Could the department provide the timetable for the upcoming high school robotics and coding initiative?',
    inquiry_status: 'resolved',
    submitted_at: new Date(Date.now() - 86400000).toISOString(),
    resolved_at: new Date().toISOString()
  }
];

export const WebsiteCmsManager: React.FC<WebsiteCmsManagerProps> = ({ onBackToDashboard }) => {
  const [activeTab, setActiveTab] = useState<'announcements' | 'faqs' | 'inquiries'>('announcements');

  // Announcements
  const { data: remoteAnnounce } = useGetAnnouncementsQuery();
  const [createAnnounceApi] = useCreateAnnouncementMutation();
  const [publishAnnounceApi] = usePublishAnnouncementMutation();
  const [archiveAnnounceApi] = useArchiveAnnouncementMutation();
  const [localAnnouncements, setLocalAnnouncements] = useState<Announcement[]>(DEFAULT_ANNOUNCEMENTS);
  const [isAnnounceModalOpen, setIsAnnounceModalOpen] = useState(false);
  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceContent, setAnnounceContent] = useState('');

  // FAQs
  const { data: remoteFaqs } = useGetFaqsQuery();
  const [createFaqApi] = useCreateFaqMutation();
  const [deleteFaqApi] = useDeleteFaqMutation();
  const [localFaqs, setLocalFaqs] = useState<FaqItem[]>(DEFAULT_FAQS);
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);
  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');
  const [faqCategory, setFaqCategory] = useState('General');

  // Inquiries
  const { data: remoteInquiries } = useGetContactInquiriesQuery();
  const [resolveInquiryApi] = useResolveContactInquiryMutation();
  const [localInquiries, setLocalInquiries] = useState<ContactInquiry[]>(DEFAULT_INQUIRIES);

  const announcements = remoteAnnounce?.data && remoteAnnounce.data.length > 0
    ? remoteAnnounce.data
    : localAnnouncements;

  const faqs = remoteFaqs?.data && remoteFaqs.data.length > 0
    ? remoteFaqs.data
    : localFaqs;

  const inquiries = remoteInquiries?.data && remoteInquiries.data.length > 0
    ? remoteInquiries.data
    : localInquiries;

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announceTitle.trim() || !announceContent.trim()) return;

    try {
      await createAnnounceApi({ title: announceTitle, content: announceContent }).unwrap();
    } catch {
      const newAnnounce: Announcement = {
        announcement_id: Date.now(),
        title: announceTitle,
        content: announceContent,
        status: 'published',
        published_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      setLocalAnnouncements((prev) => [newAnnounce, ...prev]);
    }
    setAnnounceTitle('');
    setAnnounceContent('');
    setIsAnnounceModalOpen(false);
  };

  const handlePublish = async (id: number) => {
    try {
      await publishAnnounceApi(id).unwrap();
    } catch {
      setLocalAnnouncements((prev) =>
        prev.map((a) => (a.announcement_id === id ? { ...a, status: 'published', published_at: new Date().toISOString() } : a))
      );
    }
  };

  const handleArchive = async (id: number) => {
    try {
      await archiveAnnounceApi(id).unwrap();
    } catch {
      setLocalAnnouncements((prev) =>
        prev.map((a) => (a.announcement_id === id ? { ...a, status: 'archived' } : a))
      );
    }
  };

  const handleCreateFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faqQuestion.trim() || !faqAnswer.trim()) return;

    try {
      await createFaqApi({ question: faqQuestion, answer: faqAnswer, category: faqCategory }).unwrap();
    } catch {
      const newFaq: FaqItem = {
        faq_id: Date.now(),
        question: faqQuestion,
        answer: faqAnswer,
        category: faqCategory,
        is_published: true,
        created_at: new Date().toISOString()
      };
      setLocalFaqs((prev) => [newFaq, ...prev]);
    }
    setFaqQuestion('');
    setFaqAnswer('');
    setIsFaqModalOpen(false);
  };

  const handleDeleteFaq = async (id: number) => {
    try {
      await deleteFaqApi(id).unwrap();
    } catch {
      setLocalFaqs((prev) => prev.filter((f) => f.faq_id !== id));
    }
  };

  const handleResolveInquiry = async (id: number) => {
    try {
      await resolveInquiryApi(id).unwrap();
    } catch {
      setLocalInquiries((prev) =>
        prev.map((inq) => (inq.inquiry_id === id ? { ...inq, inquiry_status: 'resolved', resolved_at: new Date().toISOString() } : inq))
      );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div>
          <button
            type="button"
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard Overview</span>
          </button>
          <h1 className="font-serif-executive text-2xl sm:text-3xl text-slate-900 flex items-center gap-2.5">
            <Globe className="w-7 h-7 text-emerald-600" />
            <span>Public Website &amp; Portal CMS</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage public notices, citizen FAQs, and review incoming contact inquiries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'announcements' && (
            <button
              type="button"
              onClick={() => setIsAnnounceModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Announcement</span>
            </button>
          )}

          {activeTab === 'faqs' && (
            <button
              type="button"
              onClick={() => setIsFaqModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add FAQ</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-6 pt-3 rounded-2xl border shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTab('announcements')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'announcements'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>Announcements &amp; News ({announcements.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('faqs')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'faqs'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Citizen FAQs ({faqs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('inquiries')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'inquiries'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>Contact Inquiries ({inquiries.filter((i) => i.inquiry_status === 'new').length} New)</span>
        </button>
      </div>

      {/* Tab 1: Announcements */}
      {activeTab === 'announcements' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {announcements.map((item) => (
              <div
                key={item.announcement_id}
                className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-start justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        item.status === 'published'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.status === 'archived'
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.status}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {item.published_at ? `Published: ${new Date(item.published_at).toLocaleDateString()}` : 'Draft'}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900">{item.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.content}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.status !== 'published' && (
                    <button
                      type="button"
                      onClick={() => handlePublish(item.announcement_id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition cursor-pointer"
                    >
                      Publish
                    </button>
                  )}
                  {item.status !== 'archived' && (
                    <button
                      type="button"
                      onClick={() => handleArchive(item.announcement_id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                    >
                      Archive
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: FAQs */}
      {activeTab === 'faqs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {faqs.map((faq) => (
            <div key={faq.faq_id} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold uppercase mb-2">
                  {faq.category}
                </span>
                <h4 className="font-bold text-sm text-slate-900 mb-2">{faq.question}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{faq.answer}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleDeleteFaq(faq.faq_id)}
                  className="text-xs text-rose-600 hover:text-rose-700 inline-flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove FAQ</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Inquiries */}
      {activeTab === 'inquiries' && (
        <div className="space-y-4">
          {inquiries.map((inq) => {
            const isResolved = inq.inquiry_status === 'resolved';
            return (
              <div
                key={inq.inquiry_id}
                className={`p-5 rounded-2xl bg-white border shadow-sm transition flex flex-col sm:flex-row sm:items-start justify-between gap-4 ${
                  isResolved ? 'border-slate-200 opacity-80' : 'border-emerald-300 ring-1 ring-emerald-200'
                }`}
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isResolved ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {inq.inquiry_status}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Submitted: {new Date(inq.submitted_at).toLocaleString()}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 mt-1">{inq.subject}</h3>
                  <div className="text-xs font-semibold text-slate-700">
                    From: {inq.sender_name} &bull; <span className="font-mono text-slate-500">{inq.sender_email}</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed mt-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    "{inq.message}"
                  </p>
                </div>

                <div className="shrink-0 flex items-center">
                  {!isResolved ? (
                    <button
                      type="button"
                      onClick={() => handleResolveInquiry(inq.inquiry_id)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Mark Resolved</span>
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400 font-semibold inline-flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Resolved</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Announcement Modal */}
      {isAnnounceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">Publish Official Notice</h3>
              <button onClick={() => setIsAnnounceModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateAnnouncement} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notice Headline *</label>
                <input
                  type="text"
                  value={announceTitle}
                  onChange={(e) => setAnnounceTitle(e.target.value)}
                  placeholder="e.g. Zonal Digital Innovation Summit"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Official Text *</label>
                <textarea
                  value={announceContent}
                  onChange={(e) => setAnnounceContent(e.target.value)}
                  rows={4}
                  placeholder="Announcement body text..."
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAnnounceModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700"
                >
                  Publish Notice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New FAQ Modal */}
      {isFaqModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">Add Portal FAQ</h3>
              <button onClick={() => setIsFaqModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateFaq} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                <input
                  type="text"
                  value={faqCategory}
                  onChange={(e) => setFaqCategory(e.target.value)}
                  placeholder="e.g. General, Letters, Passwords"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Question *</label>
                <input
                  type="text"
                  value={faqQuestion}
                  onChange={(e) => setFaqQuestion(e.target.value)}
                  placeholder="e.g. How can I reset my password?"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Answer *</label>
                <textarea
                  value={faqAnswer}
                  onChange={(e) => setFaqAnswer(e.target.value)}
                  rows={3}
                  placeholder="Detailed answer for users..."
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFaqModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700"
                >
                  Save FAQ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default WebsiteCmsManager;
