'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { timezones } from '@/utils/timezones';
import { ContactListSkeleton } from '@/components/SkeletonLoaders';
import { ChevronLeftIcon, ChevronRightIcon, AdjustmentsHorizontalIcon, ChatBubbleLeftRightIcon, PhoneIcon, CheckCircleIcon, XCircleIcon, InformationCircleIcon, DocumentTextIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import BulkAddToPipelineStage from '@/components/contacts/BulkAddToPipelineStage';
import { Contact } from '@/types';
import BulkUploadForm from '@/components/BulkUploadForm';
import { useAuth } from '@/contexts/AuthContext';
import { ConversationDisplay } from '@/types/messageThread';
import { IconButton } from '@/components/ui/iconButton';


interface CustomField {
  id: string;
  key: string;
  value: string | string[] | boolean;
}

interface PicklistOption {
  value: string;
  name: string;
}

interface CustomFieldDefinition {
  id: string;
  name: string;
  fieldKey: string;
  dataType: 'TEXT' | 'MULTIPLE_OPTIONS' | 'CHECKBOX' | 'STANDARD_FIELD';
  picklistOptions?: PicklistOption[];
}

interface TableColumn {
  id: string;
  label: string;
  key: string;
  visible: boolean;
}

export default function ContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkAddOpportunities, setIsBulkAddOpportunities] = useState(false);
  const [isBulkMessagingModalOpen, setIsBulkMessagingModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifyPhoneNumber, setVerifyPhoneNumber] = useState('');
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [verificationMessage, setVerificationMessage] = useState('');
  const [phoneDetails, setPhoneDetails] = useState<any>(null);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [selectedMessageType, setSelectedMessageType] = useState<'sms' | 'email' | 'voicemail' | null>(null);

  const [columns, setColumns] = useState<TableColumn[]>([
    { id: 'name', label: 'Name', key: 'name', visible: true },
    { id: 'email', label: 'Email', key: 'email', visible: true },
    { id: 'phone', label: 'Phone', key: 'phone', visible: true },
    { id: 'tags', label: 'Tags', key: 'tags', visible: true },
    { id: 'type', label: 'Type', key: 'type', visible: false },
    { id: 'timezone', label: 'Timezone', key: 'timezone', visible: false },
    { id: 'dnd', label: 'DND Status', key: 'dnd', visible: false },
    { id: 'source', label: 'Source', key: 'source', visible: false },
    { id: 'address1', label: 'Address', key: 'address1', visible: false },
    { id: 'city', label: 'City', key: 'city', visible: false },
    { id: 'state', label: 'State', key: 'state', visible: false },
    { id: 'country', label: 'Country', key: 'country', visible: false },
    { id: 'postalCode', label: 'Postal Code', key: 'postalCode', visible: false },
  ]);

  const [newContact, setNewContact] = useState<Contact>({
    id: '',
    name: '',
    firstName: '',
    lastName: '',
    locationId: '',
    email: '',
    phone: '',
    tags: [],
    timezone: '',
    dnd: false,
    customFields: {},
    source: '',
    postalCode: '',
    city: '',
    state: '',
    country: 'US',
    address1: '',
  });

  const [editContact, setEditContact] = useState<Contact>({
    id: '',
    name: '',
    firstName: '',
    lastName: '',
    locationId: '',
    email: '',
    phone: '',
    tags: [],
    timezone: '',
    dnd: false,
    customFields: {},
    source: '',
    postalCode: '',
    city: '',
    state: '',
    country: '',
    address1: '',
    createdAt: '',
    updatedAt: '',
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [contactsPerPage, setContactsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalContacts, setTotalContacts] = useState(0);
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const [lastContactId, setLastContactId] = useState<string | null>(null);

  const getAppropriateType = (type: string) => {
    switch (type) {
      case 'TYPE_PHONE':
        return 'SMS';
      case 'TYPE_EMAIL':
      case 'TYPE_CUSTOM_EMAIL':
        return 'Email';
      default:
        return 'SMS';
    }
  };

  const { user } = useAuth();
  const hasPhoneNumbers = (user?.phoneNumbers?.length ?? 0) > 0;
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
  const [smsText, setSmsText] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isBulkInProcess, setIsBulkInProcess] = useState(false);
  useEffect(() => {
    if (hasPhoneNumbers) {
      setSelectedNumber(user!.phoneNumbers![0].phoneNumber);
    }
  }, [hasPhoneNumbers, user?.phoneNumbers]);

  const handleSend = async (contact: any) => {
    const conversationType = selectedMessageType == 'sms' ? 'TYPE_PHONE' : 'TYPE_EMAIL';

    if (!conversationType) return;

    if (conversationType === 'TYPE_PHONE' && !hasPhoneNumbers) {
      toast.error('No available phone number to send SMS');
      return;
    }
    try {
      const payload = {
        type: getAppropriateType(conversationType),
        body: smsText,
        text: smsText,
        message: smsText,
        contactId: contact.id,
        ...(conversationType === 'TYPE_PHONE' && {
          toNumber: contact!.phone,
          fromNumber: selectedNumber,
        }),
        ...(conversationType === 'TYPE_EMAIL' && {
          html: emailBody,
          emailTo: contact!.email,
          subject: emailSubject,
          emailFrom: 'no-reply@gmail.com',
          body: smsText,
          text: smsText,
          message: smsText,
        }),
      };

      console.log(`[payload]: ${JSON.stringify(payload)}`);
      const response = await fetch('/api/conversations/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      return await response.json();

    } catch (error) {
      console.error('Failed to create conversation:', error);
      toast.error('Failed to start new conversation');
    }
  };

  const bulkSendEmailOrSMS = async () => {
    if (selectedMessageType === 'voicemail') {
      router.push('/ringless-voicemails');
      return;
    }
    if (!selectedContacts || selectedContacts.length === 0) {
      toast.error('No contacts selected for bulk action');
      return;
    }
    if (selectedMessageType === 'sms') {
      if (!hasPhoneNumbers) {
        toast.error('No available phone number to send SMS');
        return;
      }
      if (!selectedNumber) {
        toast.error('Please select a phone number to send SMS');
        return;
      }
    }

    let successCount = 0;
    const totalContacts = selectedContacts.length;

    try {
      setIsBulkInProcess(true);
      // Use Promise.all to wait for all sends to complete
      const results = await Promise.all(
        selectedContacts.map(async (contact) => {
          try {
            const response = await handleSend(contact);
            if (response && (response.msg || response.messageId)) {
              successCount++;
            }
            return response;
          } catch (error) {
            console.error('Failed to send to contact:', contact.id, error);
            return null;
          }
        })
      );

      // Show final result
      toast.success(
        `Bulk messaging completed! Successfully sent to ${successCount} out of ${totalContacts} contacts`
      );
      setIsBulkMessagingModalOpen(false)
    } catch (error) {
      console.error('Bulk messaging failed:', error);
      toast.error(
        `Bulk messaging completed with errors. Successfully sent to ${successCount} out of ${totalContacts} contacts`
      );
    } finally {
      setIsBulkInProcess(false);
    }
  };

  // Load columns from localStorage
  useEffect(() => {
    const savedColumns = localStorage.getItem('contactColumns');
    if (savedColumns) {
      const parsedColumns = JSON.parse(savedColumns);
      setColumns(prev => {
        const mergedColumns = [...prev];
        parsedColumns.forEach((savedCol: TableColumn) => {
          const index = mergedColumns.findIndex(col => col.id === savedCol.id);
          if (index !== -1) {
            mergedColumns[index].visible = savedCol.visible; // Update visibility
          } else {
            mergedColumns.push(savedCol); // Add any new columns from localStorage
          }
        });
        console.log('Merged columns from localStorage:', mergedColumns); // Debug log
        return mergedColumns;
      });
    }
  }, []);

  // Save columns to localStorage
  useEffect(() => {
    localStorage.setItem('contactColumns', JSON.stringify(columns));
  }, [columns]);

  // Add custom fields to columns
  useEffect(() => {
    if (customFields.length > 0) {
      const customColumns = customFields.map(field => ({
        id: field.id,
        label: field.name,
        key: field.fieldKey,
        visible: false,
      }));
      setColumns(prev => {
        const existingIds = new Set(prev.map(col => col.id));
        const newColumns = customColumns.filter(col => !existingIds.has(col.id));
        const updatedColumns = [...prev, ...newColumns];
        console.log('Updated columns:', updatedColumns); // Debug log
        return updatedColumns;
      });
    }
  }, [customFields]);

  // Fetch data
  useEffect(() => {
    const validateAndFetch = async () => {
      try {
        await Promise.all([fetchContacts(), fetchCustomFields()]);
      } catch (error) {
        console.error('Initial fetch failed:', error);
        router.push('/auth/login?error=validation_failed');
      }
    };
    validateAndFetch();
  }, [router]);

  useEffect(() => {
    fetchContacts();
  }, [currentPage, contactsPerPage, activeTagFilter]);

  const fetchContacts = async () => {
    try {
      console.log(`Fetching contacts for page ${currentPage}... limit: ${contactsPerPage}`);
      setIsLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: contactsPerPage.toString(),
        ...(activeTagFilter && { tag: activeTagFilter }),
        ...(currentPage > 1 && lastContactId && { startAfter: lastContactId }), // Pass last contact ID
      });
      const response = await axios.get(`/api/contacts?${params.toString()}`);
      const processedContacts = response.data.contacts.map((contact: Contact) => ({
        ...contact,
        name: contact.name || contact.firstName || (contact.phone ? `Contact ${contact.phone.slice(-4)}` : 'Unknown Contact'),
      }));
      setContacts(processedContacts);
      setLastContactId(processedContacts[processedContacts.length - 1]?.id || ''); // Update last contact ID
      const total = response.data.total;
      setTotalContacts(total);
      const newTotalPages = Math.ceil(total / contactsPerPage) || 1;
      setTotalPages(newTotalPages);
      if (currentPage > newTotalPages) setCurrentPage(newTotalPages); // Adjust page if needed
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch contacts');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [currentPage, contactsPerPage, activeTagFilter]);


  const fetchCustomFields = async () => {
    try {
      const fields: CustomFieldDefinition[] = [
        {
          id: "ECqyHR21ZJnSMolxlHpU",
          dataType: "STANDARD_FIELD",
          fieldKey: "contact.type",
          name: "Contact Type",
          picklistOptions: [
            { value: "lead", name: "Lead" },
            { value: "customer", name: "Customer" },
          ],
        },
      ];
      setCustomFields(fields);
    } catch (err: any) {
      toast.error('Failed to load custom fields');
    }
  };

  const handleEdit = (contact: Contact) => {
    setSelectedContact(contact);
    // Convert customFields array to object
    const customFieldsObject: { [key: string]: string | number | boolean | null } = {};
    if (contact.customFields) {
      if (Array.isArray(contact.customFields)) {
        contact.customFields.forEach((field: CustomField) => {
          customFieldsObject[field.key] = field.value as string | number | boolean | null;
        });
      } else {
        Object.assign(customFieldsObject, contact.customFields);
      }
    }

    setEditContact({
      id: contact.id,
      name: contact.name || '',
      firstName: contact.firstName || '',
      lastName: contact.lastName || '',
      locationId: contact.locationId || '',
      email: contact.email || '',
      phone: contact.phone || '',
      tags: contact.tags || [],
      timezone: contact.timezone || '',
      dnd: contact.dnd || false,
      customFields: customFieldsObject,
      source: contact.source || '',
      postalCode: contact.postalCode || '',
      city: contact.city || '',
      state: contact.state || '',
      country: contact.country || '',
      address1: contact.address1 || '',
    });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (formData: Contact) => {
    if (!selectedContact) return;
    setIsSubmitting(true);
    try {
      const response = await axios.put(`/api/contacts/${selectedContact.id}`, formData);
      if (response.data) {
        setContacts(prev =>
          prev.map(c => (c.id === selectedContact.id ? { ...c, ...response.data } : c))
        );
        toast.success('Contact updated successfully');
        setIsEditModalOpen(false);
        setSelectedContact(null);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update contact');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (contact: Contact) => {
    setSelectedContact(contact);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedContact) return;
    setIsSubmitting(true);
    try {
      await axios.delete(`/api/contacts/${selectedContact.id}`);
      setContacts(prev => prev.filter(c => c.id !== selectedContact.id));
      setTotalContacts(prev => prev - 1);
      setTotalPages(Math.ceil((totalContacts - 1) / contactsPerPage));
      setIsDeleteModalOpen(false);
      toast.success('Contact deleted successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete contact');
    } finally {
      setIsSubmitting(false);
      setSelectedContact(null);
    }
  };

  const handleAdd = async (formData: Contact) => {
    setIsSubmitting(true);
    if (!formData.name && !formData.firstName) {
      toast.error('Name or First Name is required');
      setIsSubmitting(false);
      return;
    }
    try {
      const response = await axios.post('/api/contacts', formData);
      const contactData = response.data.contact;
      if (contactData && contactData.id) {
        const processedContact = {
          ...contactData,
          name: contactData.name || contactData.firstName || (contactData.phone ? `Contact ${contactData.phone.slice(-4)}` : 'Unknown Contact'),
        };
        setContacts(prev => [processedContact, ...prev]);
        setTotalContacts(prev => prev + 1);
        setTotalPages(Math.ceil((totalContacts + 1) / contactsPerPage));
        toast.success('Contact added successfully');
        setIsAddModalOpen(false);
        setNewContact({
          id: '',
          name: '',
          firstName: '',
          lastName: '',
          locationId: user?.locationId || '',
          email: '',
          phone: '',
          tags: [],
          timezone: '',
          dnd: false,
          customFields: {},
          source: '',
          postalCode: '',
          city: '',
          state: '',
          country: 'US',
          address1: '',
        });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add contact');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCustomFieldInput = (field: CustomFieldDefinition, value: any, onChange: (value: any) => void) => {
    const options = field.picklistOptions?.map(option => ({
      value: option.value,
      label: option.name,
    })) || [];
    const fieldValue = Array.isArray(value)
      ? value.find((v: any) => v.id === field.id)?.value || ''
      : value || (field.dataType === 'CHECKBOX' ? [] : '');

    if (field.picklistOptions && field.picklistOptions.length > 0) {
      return (
        <select
          value={typeof fieldValue === 'string' ? fieldValue : ''}
          onChange={e => onChange({ id: field.id, key: field.fieldKey, value: e.target.value })}
          className="mt-1 block w-full border border-gray-200 rounded-md p-2 bg-white/50 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
          disabled={isSubmitting}
        >
          <option value="">Select {field.name}</option>
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    switch (field.dataType) {
      case 'TEXT':
        return (
          <input
            type="text"
            value={fieldValue || ''}
            onChange={e => onChange({ id: field.id, key: field.fieldKey, value: e.target.value })}
            className="mt-1 block w-full border border-gray-200 rounded-md p-2 bg-white/50 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
            placeholder={`Enter ${field.name}`}
            disabled={isSubmitting}
          />
        );
      case 'CHECKBOX':
        return (
          <div className="space-y-2">
            {options.map(option => (
              <label key={option.value} className="flex items-center">
                <input
                  type="checkbox"
                  checked={Array.isArray(fieldValue) ? fieldValue.includes(option.value) : false}
                  onChange={e => {
                    const newValue = Array.isArray(fieldValue) ? [...fieldValue] : [];
                    if (e.target.checked) newValue.push(option.value);
                    else newValue.splice(newValue.indexOf(option.value), 1);
                    onChange({ id: field.id, key: field.fieldKey, value: newValue });
                  }}
                  className="mr-2"
                  disabled={isSubmitting}
                />
                {option.label}
              </label>
            ))}
          </div>
        );
      default:
        return (
          <input
            type="text"
            value={fieldValue || ''}
            onChange={e => onChange({ id: field.id, key: field.fieldKey, value: e.target.value })}
            className="mt-1 block w-full border border-gray-200 rounded-md p-2 bg-white/50 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
            placeholder={`Enter ${field.name}`}
            disabled={isSubmitting}
          />
        );
    }
  };

  const ModalContent = ({ isEdit = false }) => {
    const [formData, setFormData] = useState<Contact>(isEdit ? editContact : newContact);

    useEffect(() => {
      setFormData(isEdit ? editContact : newContact);
    }, [isEdit, editContact, newContact]);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (isEdit) {
        handleUpdate(formData);
      } else {
        handleAdd(formData);
      }
    };

    const handleTagChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const tags = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag);
      setFormData(prev => ({ ...prev, tags }));
    };

    return (
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        onClick={() => (isEdit ? setIsEditModalOpen(false) : setIsAddModalOpen(false))}
      >
        <div
          className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => {
              if (isEdit) {
                setIsEditModalOpen(false);
              } else {
                setIsAddModalOpen(false);
                setNewContact({
                  id: '',
                  name: '',
                  firstName: '',
                  lastName: '',
                  locationId: user?.locationId || '',
                  email: '',
                  phone: '',
                  tags: [],
                  timezone: '',
                  dnd: false,
                  customFields: {},
                  source: '',
                  postalCode: '',
                  city: '',
                  state: '',
                  country: 'US',
                  address1: '',
                });
              }
            }}
            className="absolute top-4 right-4 w-6 h-6 text-gray-600 hover:text-gray-800 rounded-full hover:bg-gray-200"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h3 className="text-xl font-semibold mb-2 text-gray-900">{isEdit ? 'Edit Contact' : 'Add New Contact'}</h3>
          <p className="text-sm text-gray-600 mb-6">{isEdit ? 'Update contact details below' : 'Create a new contact'}</p>
          <form onSubmit={handleSubmit}>
            <div className="space-y-5">
              {/* Name Fields */} 
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={formData.firstName || ''}
                    onChange={e => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full border border-gray-200 rounded-md p-2 bg-white/50 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={formData.lastName || ''}
                    onChange={e => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full border border-gray-200 rounded-md p-2 bg-white/50 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full border border-gray-200 rounded-md p-2 bg-white/50 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full border border-gray-200 rounded-md p-2 bg-white/50 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              {/* Timezone and DND */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                <select
                  value={formData.timezone || ''}
                  onChange={e => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
                  className="w-full border border-gray-200 rounded-md p-2 bg-white/50 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
                  disabled={isSubmitting}
                >
                  <option value="">Select Timezone</option>
                  {timezones.map(timezone => (
                    <option key={timezone.value} value={timezone.value}>
                      {timezone.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                  <input
                    type="checkbox"
                    checked={formData.dnd}
                    onChange={e => setFormData(prev => ({ ...prev, dnd: e.target.checked }))}
                    className="mr-2"
                    disabled={isSubmitting}
                  />
                  Do Not Disturb
                </label>
              </div>

              {/* Address Fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
                <input
                  type="text"
                  value={formData.address1 || ''}
                  onChange={e => setFormData(prev => ({ ...prev, address1: e.target.value }))}
                  className="w-full border border-gray-200 rounded-md p-2 bg-white/50 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
                  disabled={isSubmitting}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city || ''}
                    onChange={e => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full border border-gray-200 rounded-md p-2 bg-white/50 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    value={formData.state || ''}
                    onChange={e => setFormData(prev => ({ ...prev, state: e.target.value }))}
                    className="w-full border border-gray-200 rounded-md p-2 bg-white/50 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                  <input
                    type="text"
                    value={formData.postalCode || ''}
                    onChange={e => setFormData(prev => ({ ...prev, postalCode: e.target.value }))}
                    className="w-full border border-gray-200 rounded-md p-2 bg-white/50 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <input
                    type="text"
                    value={formData.country || ''}
                    onChange={e => setFormData(prev => ({ ...prev, country: e.target.value }))}
                    className="w-full border border-gray-200 rounded-md p-2 bg-white/50 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                <input
                  type="text"
                  value={formData.source || ''}
                  onChange={e => setFormData(prev => ({ ...prev, source: e.target.value }))}
                  className="w-full border border-gray-200 rounded-md p-2 bg-white/50 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
                  disabled={isSubmitting}
                />
              </div>

              {/* Custom Fields */}
              {customFields.map(field => {
                const customFieldValue =
                  formData.customFields && typeof formData.customFields === 'object'
                    ? formData.customFields[field.fieldKey] || (field.dataType === 'CHECKBOX' ? [] : '')
                    : field.dataType === 'CHECKBOX' ? [] : '';
                return (
                  <div key={field.id}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{field.name}</label>
                    {renderCustomFieldInput(field, customFieldValue, value => {
                      const updatedCustomFields = {
                        ...(formData.customFields || {}),
                        [field.fieldKey]: value.value,
                      };
                      setFormData(prev => ({ ...prev, customFields: updatedCustomFields }));
                    })}
                  </div>
                );
              })}


            </div>
            <div className="mt-8 flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => (isEdit ? setIsEditModalOpen(false) : setIsAddModalOpen(false))}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : isEdit ? 'Update Contact' : 'Add Contact'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const filterContactsByTag = (tag: string | null) => {
    setActiveTagFilter(tag);
    setCurrentPage(1);
  };

  const changePage = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleContactsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = parseInt(e.target.value, 10);
    setContactsPerPage(newValue);
    setCurrentPage(1);
  };

  const TagFilters = () => {
    const allTags = new Set<string>();
    contacts.forEach(contact => contact.tags?.forEach(tag => allTags.add(tag)));
    const uniqueTags = Array.from(allTags).sort();
    const scrapedLeadIndex = uniqueTags.indexOf('scraped-lead');
    if (scrapedLeadIndex > -1) {
      uniqueTags.splice(scrapedLeadIndex, 1);
      uniqueTags.unshift('scraped-lead');
    }

    return (
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Filter by Tag</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => filterContactsByTag(null)}
            className={`px-3 py-1 rounded-full text-sm ${activeTagFilter === null ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
          >
            All Contacts ({totalContacts})
          </button>
          {uniqueTags.map(tag => {
            const count = contacts.filter(c => c.tags?.includes(tag)).length;
            return (
              <button
                key={tag}
                onClick={() => filterContactsByTag(tag)}
                className={`px-3 py-1 rounded-full text-sm ${activeTagFilter === tag ? 'bg-purple-600 text-white' : tag === 'scraped-lead' ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
              >
                {tag === 'scraped-lead' ? 'Scraped Leads' : tag} ({count})
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const PaginationControls = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 mt-4">
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{(currentPage - 1) * contactsPerPage + 1}</span> to{' '}
              <span className="font-medium">{Math.min(currentPage * contactsPerPage, totalContacts)}</span> of{' '}
              <span className="font-medium">{totalContacts}</span> results
            </p>
          </div>
          <div className="flex items-center">
            <div className="mr-4">
              <label htmlFor="perPage" className="mr-2 text-sm text-gray-700">Show</label>
              <select
                id="perPage"
                value={contactsPerPage}
                onChange={handleContactsPerPageChange}
                className="rounded-md border-gray-300 focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <nav className="inline-flex -space-x-px rounded-md shadow-sm">
              <button
                onClick={() => changePage(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-2 py-2 rounded-l-md ${currentPage === 1 ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              {startPage > 1 && (
                <>
                  <button
                    onClick={() => changePage(1)}
                    className={`px-4 py-2 text-sm font-semibold ${currentPage === 1 ? 'bg-purple-600 text-white' : 'text-gray-900 hover:bg-gray-50'}`}
                  >
                    1
                  </button>
                  {startPage > 2 && <span className="px-4 py-2 text-sm text-gray-700">...</span>}
                </>
              )}
              {pageNumbers.map(number => (
                <button
                  key={number}
                  onClick={() => changePage(number)}
                  className={`px-4 py-2 text-sm font-semibold ${currentPage === number ? 'bg-purple-600 text-white' : 'text-gray-900 hover:bg-gray-50'}`}
                >
                  {number}
                </button>
              ))}
              {endPage < totalPages && (
                <>
                  {endPage < totalPages - 1 && <span className="px-4 py-2 text-sm text-gray-700">...</span>}
                  <button
                    onClick={() => changePage(totalPages)}
                    className={`px-4 py-2 text-sm font-semibold ${currentPage === totalPages ? 'bg-purple-600 text-white' : 'text-gray-900 hover:bg-gray-50'}`}
                  >
                    {totalPages}
                  </button>
                </>
              )}
              <button
                onClick={() => changePage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-2 py-2 rounded-r-md ${currentPage === totalPages ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  const toggleColumnVisibility = (columnId: string) => {
    setColumns(prev =>
      prev.map(column => (column.id === columnId ? { ...column, visible: !column.visible } : column))
    );
  };

  const ColumnManager = () => {
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsColumnSelectorOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, []);

    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsColumnSelectorOpen(!isColumnSelectorOpen);
          }}
          className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center"
        >
          <AdjustmentsHorizontalIcon className="h-4 w-4 mr-2" />
          Manage Columns
        </button>
        {isColumnSelectorOpen && (
          <div className="absolute right-0 mt-2 w-64 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
            <div className="p-2 border-b border-gray-100">
              <h3 className="text-xs font-medium text-gray-500 uppercase">Columns</h3>
            </div>
            <div className="py-1 max-h-64 overflow-y-auto">
              {columns.map(column => (
                <label
                  key={column.id}
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={column.visible}
                    onChange={() => toggleColumnVisibility(column.id)}
                    className="mr-2 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  {column.label}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    const handleClickOutside = () => setIsColumnSelectorOpen(false);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isColumnSelectorOpen]);

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(contacts);
    }
    setIsAllSelected(!isAllSelected);
  };

  const toggleSelectContact = (contact: Contact) => {
    setSelectedContacts(prev =>
      prev.includes(contact) ? prev.filter(c => c.id !== contact.id) : [...prev, contact]
    );
  };

  useEffect(() => {
    setIsAllSelected(contacts.length > 0 && selectedContacts.length === contacts.length);
  }, [selectedContacts, contacts]);

  const confirmBulkDelete = async () => {
    setIsSubmitting(true);
    try {
      await Promise.all(selectedContacts.map(contact => axios.delete(`/api/contacts/${contact.id}`)));
      setContacts(prev => prev.filter(contact => !selectedContacts.includes(contact)));
      setTotalContacts(prev => prev - selectedContacts.length);
      setTotalPages(Math.ceil((totalContacts - selectedContacts.length) / contactsPerPage) || 1);
      setIsBulkDeleteModalOpen(false);
      setSelectedContacts([]);
      toast.success(`${selectedContacts.length} contacts deleted successfully`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete contacts');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCell = (column: TableColumn, contact: Contact) => {
    switch (column.key) {
      case 'name':
        return (
          <div 
            onClick={() => router.push(`/contacts/${contact.id}`)}
            className="text-purple-600 hover:text-purple-800 font-medium cursor-pointer hover:underline"
          >
            {contact.name || contact.firstName || (contact.phone ? `Contact ${contact.phone.slice(-4)}` : 'Unknown Contact')}
          </div>
        );
      case 'email':
        return contact.email || '-';
      case 'phone':
        return contact.phone || '-';
      case 'tags':
        return contact.tags?.length ? (
          <div className="flex flex-wrap gap-1">
            {contact.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : '-';
      case 'type':
        return contact.type || '-';
      case 'timezone':
        return contact.timezone || '-';
      case 'dnd':
        return contact.dnd ? 'Yes' : 'No';
      case 'source':
        return contact.source || '-';
      case 'address1':
        return contact.address1 || '-';
      case 'city':
        return contact.city || '-';
      case 'state':
        return contact.state || '-';
      case 'country':
        return contact.country || '-';
      case 'postalCode':
        return contact.postalCode || '-';
      default:
        return '-';
    }
  };

  const lookupPhoneNumber = async (phone: string) => {
    if (!phone) {
      toast.error('Please enter a phone number');
      return;
    }
    setVerificationStatus('loading');
    setVerificationMessage('');
    setPhoneDetails(null);
    const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
    try {
      const response = await axios.post('/api/twilio/verify', { phone: formattedPhone });
      if (response.data?.success) {
        setVerificationStatus('success');
        setVerificationMessage('Phone number validated successfully');
        setPhoneDetails(response.data.data);
        toast.success('Phone number validated');
      } else {
        throw new Error(response.data?.error || 'Failed to validate phone number');
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.details?.message || err.response?.data?.error || err.message || 'Failed to validate phone number';
      setVerificationStatus('error');
      setVerificationMessage(errorMessage);
      toast.error(errorMessage);
    }
  };

  const resetVerificationModal = () => {
    setVerifyPhoneNumber('');
    setVerificationStatus('idle');
    setVerificationMessage('');
    setPhoneDetails(null);
  };

  const PhoneLookupModal = () => {
    return (
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        onClick={() => {
          setIsVerifyModalOpen(false);
          resetVerificationModal();
        }}
      >
        <div
          className="bg-white rounded-xl shadow-xl w-full max-w-md p-6"
          onClick={e => e.stopPropagation()}
        >
          <h3 className="text-xl font-semibold mb-4 text-gray-900">Phone Number Lookup</h3>
          <div className="mb-5">
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <input
                type="tel"
                id="phone"
                className="block w-full pr-10 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="+1 (123) 456-7890"
                value={verifyPhoneNumber}
                onChange={e => setVerifyPhoneNumber(e.target.value)}
                onBlur={e => {
                  const phone = e.target.value.trim();
                  if (phone && !phone.startsWith('+')) setVerifyPhoneNumber(`+${phone}`);
                }}
                autoFocus
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <PhoneIcon className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>
          {verificationStatus !== 'idle' && (
            <div
              className={`mb-4 p-3 rounded-md ${verificationStatus === 'loading' ? 'bg-blue-50 text-blue-800' : verificationStatus === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}
            >
              <div className="flex items-start">
                {verificationStatus === 'loading' && (
                  <svg className="animate-spin h-5 w-5 mr-2 mt-0.5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 01-16 0z" />
                  </svg>
                )}
                {verificationStatus === 'success' && <CheckCircleIcon className="h-5 w-5 mr-2 mt-0.5" />}
                {verificationStatus === 'error' && <XCircleIcon className="h-5 w-5 mr-2 mt-0.5" />}
                <div>
                  <p>{verificationStatus === 'loading' ? 'Validating phone number...' : verificationMessage}</p>
                  {phoneDetails && (
                    <div className="mt-2 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="font-semibold">Country Code:</div>
                        <div>{phoneDetails.country_code || 'N/A'}</div>
                        <div className="font-semibold">Carrier:</div>
                        <div>{phoneDetails.carrier?.name || 'N/A'}</div>
                        <div className="font-semibold">Type:</div>
                        <div>{phoneDetails.line_type_intelligence?.type || 'N/A'}</div>
                        <div className="font-semibold">Valid:</div>
                        <div>{phoneDetails.valid ? 'Yes' : 'No'}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setIsVerifyModalOpen(false);
                resetVerificationModal();
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
            >
              Close
            </button>
            <button
              onClick={() => lookupPhoneNumber(verifyPhoneNumber)}
              disabled={verificationStatus === 'loading' || !verifyPhoneNumber}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm disabled:opacity-50 flex items-center"
            >
              {verificationStatus === 'loading' ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-2 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 01-16 0z" />
                  </svg>
                  Validating...
                </>
              ) : (
                <>
                  <InformationCircleIcon className="h-4 w-4 mr-2" />
                  Lookup Phone
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleBulkUpload = async (contacts: { firstName: string; lastName: string; phone: string; street: string; city: string; state: string; pipelineId: any; email?: string; notes?: string; zipCode?: string; stageId?: string }[]) => {
    let selectedPipelineId = null;
    let selectedStageId = null;
    setIsSubmitting(true);
    try {

      const uploadResults = await Promise.all(
        contacts.map(async (contact) => {
          try {
            selectedPipelineId = contact.pipelineId;
            selectedStageId = contact.stageId;
            const response = await axios.post('/api/contacts', {

              firstName: contact.firstName,
              lastName: contact.lastName,
              phone: contact.phone,
              address1: contact.street,
              city: contact.city,
              state: contact.state,
              email: contact.email,
              // notes: contact.notes,
              source: 'bulk_upload',
              postalCode: contact.zipCode,
            });

            return { success: true, contact: response.data.contact };
          } catch (error) {
            console.warn(`Failed to upload contact "${contact.firstName || contact.phone}":`, error);
            return { success: false, contact: null };
          }
        })
      );
      const successfulUploads = uploadResults.filter((result) => result.success);
      const failedUploads = uploadResults.length - successfulUploads.length;
      const processedContacts = successfulUploads.map((result) => {
        const contact = result.contact!;
        return {
          ...contact,
          name: contact.name || contact.firstName || (contact.phone ? `Contact ${contact.phone.slice(-4)}` : 'Unknown Contact'),
        };
      });


      setContacts((prev) => [...processedContacts, ...prev]);
      setTotalContacts((prev) => prev + processedContacts.length);
      setTotalPages(Math.ceil((totalContacts + processedContacts.length) / contactsPerPage));

      if (successfulUploads.length === contacts.length) {
        toast.success(`${successfulUploads.length} contacts added successfully`);
      } else if (successfulUploads.length > 0) {
        toast.success(`${successfulUploads.length} out of ${contacts.length} contacts have been uploaded successfully`);

      } else {
        if (failedUploads > 0) {
          toast.error(`${failedUploads} contact(s) failed to upload either due to invalid phone number or already exists.`);

        }
      }
      addContactsToPipeline(selectedPipelineId!, selectedStageId!, processedContacts);
      setIsBulkUploadModalOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to add contacts');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addContactsToPipeline = async (pipelineId: string, stageId: string, contacts: any) => {
    try {
      const results = await Promise.allSettled(
        contacts.map(async (contact: any) => {
          try {
            const response = await fetch('/api/opportunities', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                pipelineId: pipelineId,
                pipelineStageId: stageId,
                contactId: contact.id,
                status: "open",
                name: `${contact.firstName} - ${contact.address1 || contact.zipCode || contact.street || contact.city || contact.state || ' - bulk'}`.trim()
              }),
            });

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            return { contact, success: true };
          } catch (error) {
            console.error(`Failed to add contact ${contact.id} to pipeline:`, error);
            return { contact, success: false, error };
          }
        })
      );

      const successful = results.filter(result => result.status === 'fulfilled' && result.value.success);
      const failed = results.filter(result => result.status === 'rejected' || !result.value.success);

      if (failed.length > 0) {
        toast.error(`${failed.length} contacts failed to add to pipeline`);
      }

      if (successful.length > 0) {
        toast.success(`${successful.length} contacts added to pipeline successfully`);
      }

      return { successful, failed };
    } catch (error) {
      console.error('Unexpected error in addContactsToPipeline:', error);
      toast.error('An unexpected error occurred while adding contacts to pipeline');
      return { successful: [], failed: contacts.map(contact => ({ contact, success: false, error })) };
    }
  };

  ///Search functionality
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false); // New state for search
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Use ref to store timeout
  const searchContactsByName = useCallback(async (name: string) => {
    try {
      setIsSearching(true);
      setError(null);

      if (!name.trim()) {
        setContacts([]);
        setCurrentPage(1);
        setTotalContacts(0);
        await fetchContacts();
        return;
      }

      const response = await fetch(`/api/contacts/search?name=${encodeURIComponent(name)}`);
      if (!response.ok) {
        throw new Error(`Search failed with status: ${response.status}`);
      }

      const data = await response.json();
      const searchedContacts = data.contacts || [];

      const processedContacts = searchedContacts.map((contact: any) => ({
        ...contact,
        name: contact.contactName || contact.firstName || (contact.phone ? `Contact ${contact.phone.slice(-4)}` : 'Unknown Contact'),
      }));

      setContacts(processedContacts);
      setTotalContacts(searchedContacts.length);
      setCurrentPage(1);
      console.log('Search results:', processedContacts);

      if (searchedContacts.length === 0) {
        toast.caller('No contacts found matching your search');
      }
    } catch (error) {
      console.error('Error searching contacts:', error);
      setError('Failed to search contacts');
      toast.error('Failed to search contacts');
    } finally {
      setIsSearching(false);
    }
  }, [fetchContacts]);
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <DashboardLayout title="Contacts">
      <div className="dashboard-card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="dashboard-card-title">All Contacts</h2>
          <div className="flex space-x-3">
            <ColumnManager />
            <button
              onClick={() => setIsVerifyModalOpen(true)}
              className="px-3 py-2 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600 flex items-center"
            >
              <InformationCircleIcon className="h-4 w-4 mr-2" />
              Verify Phone
            </button>
            <button
              onClick={() => setIsBulkUploadModalOpen(true)}
              className="px-3 py-2 bg-purple-500 text-white rounded-md text-sm font-medium hover:bg-purple-600 flex items-center"
            >
              <DocumentTextIcon className="h-4 w-4 mr-2" />
              Bulk Upload
            </button>
            <button onClick={() => setIsAddModalOpen(true)} className="btn-primary">
              Add Contact
            </button>
          </div>
        </div>

        {/* Search Input Moved Here */}
        <div className="mb-6">
          <div className="relative">
            <div className="mb-6">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSearchQuery(value);

                    // Clear previous timeout
                    if (searchTimeoutRef.current) {
                      clearTimeout(searchTimeoutRef.current);
                    }

                    // Set new timeout
                    searchTimeoutRef.current = setTimeout(() => {
                      searchContactsByName(value);
                    }, 300);
                  }}
                  placeholder="Search contacts by name..."
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                  disabled={isSearching}
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  {isSearching ? (
                    <svg className="animate-spin h-5 w-5 text-gray-400" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 01-16 0z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  )}
                </div>
              </div>
            </div>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {isSearching ? (
                <svg className="animate-spin h-5 w-5 text-gray-400" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 01-16 0z" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </div>
          </div>
        </div>

        {contacts.length > 0 && <TagFilters />}

        {isAddModalOpen && <ModalContent />}
        {isEditModalOpen && <ModalContent isEdit />}
        {isDeleteModalOpen && selectedContact && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setIsDeleteModalOpen(false)}
          >
            <div
              className="bg-white rounded-xl shadow-xl w-full max-w-md p-6"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900">Delete Contact</h3>
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to delete "{selectedContact.name}"? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
        {isBulkDeleteModalOpen && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setIsBulkDeleteModalOpen(false)}
          >
            <div
              className="bg-white rounded-xl shadow-xl w-full max-w-md p-6"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900">Delete Selected Contacts</h3>
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to delete {selectedContacts.length} selected contacts? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setIsBulkDeleteModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmBulkDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Deleting...' : 'Delete Selected'}
                </button>
              </div>
            </div>
          </div>
        )}
        <BulkAddToPipelineStage
          contacts={selectedContacts}
          isOpen={isBulkAddOpportunities}
          setIsOpen={setIsBulkAddOpportunities}
          onComplete={() => setIsLoading(false)}
          onError={error => {
            setError(error);
            setIsLoading(false);
          }}
          isSubmitting={isSubmitting}
        />
        {isVerifyModalOpen && <PhoneLookupModal />}
        {isBulkUploadModalOpen && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setIsBulkUploadModalOpen(false)}
          >
            <div
              className="bg-white rounded-xl shadow-xl w-full max-w-4xl p-6"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setIsBulkUploadModalOpen(false)}
                className="absolute top-4 right-4 w-6 h-6 text-gray-600 hover:text-gray-800 rounded-full hover:bg-gray-200"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <BulkUploadForm onContactsSelect={handleBulkUpload} isLoading={isSubmitting} />
            </div>
          </div>
        )}

        {isBulkMessagingModalOpen && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setIsBulkMessagingModalOpen(false)}
          >
            <div
              className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6"
              onClick={e => {
                return e.stopPropagation();
              }}
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900">Send Bulk Message</h3>
              <p className="text-sm text-gray-600 mb-6">
                Send a message to {selectedContacts.length} selected contacts.
              </p>

              {selectedMessageType ? (
                <div>
                  {selectedMessageType === 'sms' && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">SMS Message</label>
                      <textarea
                        value={smsText}
                        onChange={(e) => setSmsText(e.target.value)}
                        className="w-full border border-gray-300 rounded-md p-2 h-32"
                        placeholder="Enter your SMS message here..."
                      />
                    </div>
                  )}

                  {selectedMessageType === 'email' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                        <input
                          type="text"
                          value={emailSubject}
                          onChange={(e) => setEmailSubject(e.target.value)}
                          className="w-full border border-gray-300 rounded-md p-2"
                          placeholder="Email subject..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Content</label>
                        <textarea
                          value={emailBody}
                          onChange={(e) => setEmailBody(e.target.value)}
                          className="w-full border border-gray-300 rounded-md p-2 h-32"
                          placeholder="Enter your email content here..."
                        />
                      </div>
                    </div>
                  )}

                  <div className="mt-6 flex justify-between">
                    <button
                      onClick={() => setSelectedMessageType(null)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
                    >
                      Back to Options
                    </button>
                    <button
                      onClick={bulkSendEmailOrSMS}
                      disabled={isBulkInProcess}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm flex items-center justify-center"
                    >
                      {isBulkInProcess ? (
                        <>
                          <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 01-16 0z" />
                          </svg>
                          Sending...
                        </>
                      ) : (
                        `Send to ${selectedContacts.length} Contacts`
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  <button
                    onClick={() => setSelectedMessageType('sms')}
                    className="flex items-center p-4 border border-gray-200 rounded-md hover:bg-gray-50"
                  >
                    <ChatBubbleLeftRightIcon className="h-6 w-6 text-blue-500 mr-3" />
                    <div className="text-left">
                      <h4 className="font-medium text-gray-900">SMS Message</h4>
                      <p className="text-sm text-gray-500">Send a text message to selected contacts</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setSelectedMessageType('email')}
                    className="flex items-center p-4 border border-gray-200 rounded-md hover:bg-gray-50"
                  >
                    <DocumentTextIcon className="h-6 w-6 text-green-500 mr-3" />
                    <div className="text-left">
                      <h4 className="font-medium text-gray-900">Email</h4>
                      <p className="text-sm text-gray-500">Send an email to selected contacts</p>
                    </div>
                  </button>

                  <button
                    onClick={() => router.push('ringless-voicemails')}
                    className="flex items-center p-4 border border-gray-200 rounded-md hover:bg-gray-50"
                  >
                    <PhoneIcon className="h-6 w-6 text-purple-500 mr-3" />
                    <div className="text-left">
                      <h4 className="font-medium text-gray-900">Ringless Voicemail</h4>
                      <p className="text-sm text-gray-500">Send a voicemail without ringing their phone</p>
                    </div>
                  </button>
                </div>
              )}

              <button
                onClick={() => {
                  setIsBulkMessagingModalOpen(false);
                  setSelectedMessageType(null);
                }}
                className="absolute top-4 right-4 w-6 h-6 text-gray-600 hover:text-gray-800 rounded-full hover:bg-gray-200"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="relative max-w-full overflow-x-auto">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="pl-4 pr-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8">
                    <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                  </th>
                  {columns.filter(col => col.visible).map(column => (
                    <th
                      key={column.id}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {column.label}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Array(5).fill(0).map((_, idx) => (
                  <tr key={idx}>
                    <td className="pl-4 pr-3 py-4 whitespace-nowrap">
                      <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                    </td>
                    {columns.filter(col => col.visible).map(column => (
                      <td key={column.id} className="px-4 py-4">
                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      </td>
                    ))}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : error ? (
          <div className="bg-red-50 p-4 rounded-md text-red-800">{error}</div>
        ) : contacts.length > 0 ? (
          <div>
            {selectedContacts.length > 0 && (
              <div className="mb-4 flex items-center justify-between bg-purple-50 p-3 rounded-md border border-purple-100">
                <span className="text-sm text-purple-800">
                  <span className="font-semibold">{selectedContacts.length}</span> contacts selected
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsBulkAddOpportunities(true)}
                    className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  >
                    Add to Opportunities
                  </button>
                  <button
                    onClick={() => setIsBulkMessagingModalOpen(true)}
                    className="px-4 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 flex items-center"
                  >
                    <ChatBubbleLeftRightIcon className="h-4 w-4 mr-1" />
                    Send Message
                  </button>
                  <button
                    onClick={() => setIsBulkDeleteModalOpen(true)}
                    className="px-4 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
                  >
                    Delete Selected
                  </button>
                </div>
              </div>
            )}
            <div className="relative max-w-full overflow-x-auto">
              <table className="w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="pl-4 pr-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                      />
                    </th>
                    {columns.filter(col => col.visible).map(column => (
                      <th
                        key={column.id}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {column.label}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {contacts.map((contact: Contact) => (
                    <tr key={contact.id} className="hover:bg-gray-50">
                      <td className="pl-4 pr-3 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedContacts.includes(contact)}
                          onChange={() => toggleSelectContact(contact)}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                      </td>
                      {columns.filter(col => col.visible).map(column => (
                        <td key={column.id} className="px-4 py-4 truncate max-w-[200px]">
                          {renderCell(column, contact)}
                        </td>
                      ))}
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-3">
                          <IconButton
                            icon={<ChatBubbleLeftRightIcon className="h-5 w-5" />}
                            onClick={() => router.push(`/messaging?contactId=${contact.id}`)}
                            tooltip="Message this contact"
                          />
                          <IconButton
                            icon={<PencilIcon className="h-5 w-5" />}
                            onClick={() => handleEdit(contact)}
                            tooltip="Edit contact"
                          />
                          <IconButton
                            icon={<TrashIcon className="h-5 w-5" />}
                            onClick={() => handleDelete(contact)}
                            tooltip="Delete contact"
                            variant="destructive"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationControls />
          </div>
        ) : (
          <p className="text-gray-500">
            No contacts found{searchQuery ? ` matching "${searchQuery}"` : activeTagFilter ? ` with the tag '${activeTagFilter}'` : ''}.
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}