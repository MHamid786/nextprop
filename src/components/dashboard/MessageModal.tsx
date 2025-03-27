'use client';

import React, { useState } from 'react';
import { PhoneNumber } from '@/contexts/AuthContext';
import { GHLContact } from '@/types/dashboard';

interface MessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionType: 'sms' | 'email' | null;
  contact: GHLContact | null;
  user: User | null;
  messageContent: {
    selectedPhoneNumber: string;
    sms: string;
    emailSubject: string;
    emailBody: string;
  };
  setMessageContent: React.Dispatch<
    React.SetStateAction<{
      selectedPhoneNumber: string;
      sms: string;
      emailSubject: string;
      emailBody: string;
    }>
  >;
  onSend: () => Promise<void>;
  isBulkSend: boolean;
}

interface User {
  email: string;
  name: string;
  locationId?: string;
  phone?: string;
  companyId?: string;
  dateAdded?: string;
  firstName?: string;
  lastName?: string;
  id: string;
  phoneNumbers?: PhoneNumber[];
}

interface Template {
  id: string;
  name: string;
  sms?: string;
  emailSubject?: string;
  emailBody?: string;
}

const TEMPLATES: Template[] = [
  {
    id: 'welcome',
    name: 'Welcome Message',
    sms: 'Hi {{first_name}}, welcome! I’m {{user_name}}, here to help you get started.',
    emailSubject: 'Welcome {{first_name}}!',
    emailBody: `Dear {{first_name}} {{last_name}},

Welcome! I’m {{user_name}}, and I’m excited to assist you. Let us know how we can help you at {{user_email}}.

Best,
{{user_name}}`
  },
  {
    id: 'followup',
    name: 'Follow-up',
    sms: 'Hi {{first_name}}, it’s {{user_name}}. Just following up - any questions?',
    emailSubject: 'Follow-up',
    emailBody: `Hi {{first_name}} {{last_name}},

It’s {{user_name}}. I wanted to follow up on our last conversation. Please reach out at {{user_phone}} if you need anything.

Regards,
{{user_name}}`
  },
  {
    id: 'reminder',
    name: 'Reminder',
    sms: 'Hello {{first_name}}, this is a reminder from me about your upcoming event. Contact {{user_name}} if needed!',
    emailSubject: 'Reminder: Upcoming Event',
    emailBody: `Dear {{first_name}} {{last_name}},

This is a friendly reminder about your upcoming event. Feel free to contact me, {{user_name}}, at {{user_email}} with any questions.

Best regards,
{{user_name}}`
  }
];

function replacePlaceholders(template: string, contact: GHLContact | null, user: User | null): string {
  let result = template;
  
  // Contact replacements
  result = result.replace(/{{first_name}}/g, contact?.firstName || contact?.name.split(' ')[0] || 'there');
  result = result.replace(/{{last_name}}/g, contact?.lastName || '');
  
  // User replacements
  result = result.replace(/{{user_name}}/g, user?.name || user?.firstName || 'Team Member');
  result = result.replace(/{{user_email}}/g, user?.email || 'no-reply@company.com');
  result = result.replace(/{{user_phone}}/g, user?.phone || user?.phoneNumbers?.[0]?.phoneNumber || 'N/A');
  
  return result;
}

export default function MessageModal({
  isOpen,
  onClose,
  actionType,
  contact,
  user,
  messageContent,
  setMessageContent,
  onSend,
  isBulkSend,

}: MessageModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  if (!isOpen) return null;

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    setSelectedTemplate(templateId);
    
    const template = TEMPLATES.find(t => t.id === templateId);
    if (template) {
      if (isBulkSend) {
        // For bulk sending, keep the placeholders intact
        setMessageContent({
          selectedPhoneNumber: messageContent.selectedPhoneNumber,
          sms: template.sms || '',
          emailSubject: template.emailSubject || '',
          emailBody: template.emailBody || ''
        });
      } else {
        // For individual sending, replace placeholders
        const replacedContent = {
          sms: template.sms ? replacePlaceholders(template.sms, contact, user) : '',
          emailSubject: template.emailSubject ? replacePlaceholders(template.emailSubject, contact, user) : '',
          emailBody: template.emailBody ? replacePlaceholders(template.emailBody, contact, user) : ''
        };
        setMessageContent(replacedContent);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-all"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {actionType === 'sms' ? `Send SMS ${isBulkSend? 'Bulk' : ''}` : 'Send Email'}
        </h3>
        <p className="text-sm text-gray-500 mb-6">
          {actionType === 'sms'
            ? `Send a quick SMS to your ${isBulkSend? 'contacts in this current pipeline`s stage' : 'contact'}`
            : 'Compose a professional email'}
        </p>

        <div className="space-y-5">
          {actionType === 'sms' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
                <select
                  id="fromPhoneNumber"
                  onSelect={(e) => setMessageContent({...messageContent, selectedPhoneNumber: e.target.value })}
                  value={messageContent.selectedPhoneNumber}
                  className="w-full border border-gray-200 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                  defaultValue={user?.phoneNumbers?.[0]?.phoneNumber || ''}
                >
                  {(user?.phoneNumbers || []).length > 0 ? (
                    user!.phoneNumbers!.map((number) => (
                      <option key={number.phoneNumber} value={number.phoneNumber}>
                        {number.phoneNumber}
                      </option>
                    ))
                
                  ) : (
                    <option value="">No number available</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
                {isBulkSend ? (
                  <div className="w-full border border-gray-200 rounded-lg p-2.5 bg-gray-50 text-gray-700 max-h-24 overflow-y-auto">
                    
                    <div className="flex flex-wrap gap-1">
                      {/* Display first 5 numbers as examples */}
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                        All contacts in current pipeline stage
                      </span>
                      
                    </div>
                  </div>
                ) : (
                  <input
                    type="text"
                    className="w-full border border-gray-200 rounded-lg p-2.5 bg-gray-50 text-gray-700"
                    value={contact?.phone || ''}
                    disabled
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                <div className="relative">
                  <select
                    className="absolute -top-8 right-0 w-40 border border-gray-200 rounded-lg p-1 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs transition-all z-20"
                    value={selectedTemplate}
                    onChange={handleTemplateChange}
                  >
                    <option value="">Templates</option>
                    {TEMPLATES.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                  <textarea
                    className="w-full border border-gray-200 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                    value={messageContent.sms}
                    onChange={(e) => setMessageContent({ ...messageContent, sms: e.target.value })}
                    rows={4}
                  />
                  {isBulkSend && (
                    <div className="mt-2 text-xs text-gray-500">
                      <p>Placeholders like {'{{'}'first_name{'}},'} {'{{'}'last_name{'}},'} {'{{'}'user_name{'}},'} will be replaced with actual values for each recipient.</p>
                      <p className="mt-1">Example: &quot;Hi {'{{'}'first_name{'}}'}&quot; will become &quot;Hi John&quot; for a contact named John.</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
                <input
                  type="email"
                  className="w-full border border-gray-200 rounded-lg p-2.5 bg-gray-50 text-gray-700"
                  value={user?.email || 'no-reply@yourdomain.com'}
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
                <input
                  type="email"
                  className="w-full border border-gray-200 rounded-lg p-2.5 bg-gray-50 text-gray-700"
                  value={contact?.email || ''}
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                  value={messageContent.emailSubject}
                  onChange={(e) => setMessageContent({ ...messageContent, emailSubject: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                <div className="relative">
                  <select
                    className="absolute -top-8 right-0 w-40 border border-gray-200 rounded-lg p-1 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs transition-all z-20"
                    value={selectedTemplate}
                    onChange={handleTemplateChange}
                  >
                    <option value="">Templates</option>
                    {TEMPLATES.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                  <textarea
                    className="w-full border border-gray-200 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                    value={messageContent.emailBody}
                    onChange={(e) => setMessageContent({ ...messageContent, emailBody: e.target.value })}
                    rows={6}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="mt-8 flex justify-end space-x-3 pt-6 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm transition-all"
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all disabled:opacity-50"
            onClick={onSend}
            disabled={  isBulkSend? false :
              actionType === 'sms'
                ? (!messageContent.sms || !((user?.phoneNumbers?.length ?? 0) > 0))
                : !messageContent.emailBody
            }
          >
            Send {actionType === 'sms' ? isBulkSend? 'BULK SMS' : 'SMS' : isBulkSend? 'BULK EMAIL' :'Email'}
          </button>
        </div>
      </div>
    </div>
  );
}
