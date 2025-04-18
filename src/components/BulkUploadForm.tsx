'use client';

import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { PhoneIcon, DocumentTextIcon, CheckCircleIcon, TagIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { Dropdown } from './ui/dropdown'

interface Contact {
  name: string;
  firstName: string;
  lastName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  email?: string;
  notes?: string;
  selected: boolean;
  zipCode?: string;
}

interface Pipeline {
  id: string;
  name: string;
  stageId: string; // Add stageId for the stage with position 0
}

interface BulkUploadFormProps {
  onContactsSelect: (contacts: { 
    firstName: string; 
    lastName: string; 
    name: string; 
    phone: string; 
    street: string; 
    city: string; 
    state: string; 
    pipelineId: string; 
    stageId: string; // Add stageId
    email?: string; 
    notes?: string; 
    zipCode?: string 
  }[]) => void;
  isLoading?: boolean;
  pipelines?: Pipeline[];
}

export default function BulkUploadForm({ onContactsSelect, isLoading = false, pipelines: initialPipelines = [] }: BulkUploadFormProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [selectedPipeline, setSelectedPipeline] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pipelines, setPipelines] = useState<Pipeline[]>(initialPipelines);
  const [loadingPipelines, setLoadingPipelines] = useState(initialPipelines.length === 0);

  // Fetch pipelines
  useEffect(() => {
    async function fetchPipelines() {
      try {
        setLoadingPipelines(true);
        const response = await fetch('/api/pipelines');
        if (!response.ok) {
          console.error('Failed to fetch pipelines:', response.status, response.statusText);
          return;
        }
        const data = await response.json();

        let pipelineData: Pipeline[] = [];
        if (Array.isArray(data) && data.length > 0) {
          pipelineData = data.map((pipeline: any) => ({
            id: pipeline.id,
            name: pipeline.name,
            stageId: pipeline.stages.find((stage: any) => stage.position === 0)?.id || ''
          }));
        } else if (data.pipelines && Array.isArray(data.pipelines)) {
          pipelineData = data.pipelines.map((pipeline: any) => ({
            id: pipeline.id,
            name: pipeline.name,
            stageId: pipeline.stages.find((stage: any) => stage.position === 0)?.id || ''
          }));
        } else {
          const extractedArrays = Object.values(data).filter(value =>
            Array.isArray(value) && value.length > 0 && value[0] && 'id' in value[0] && 'name' in value[0]
          );
          if (extractedArrays.length > 0) {
            pipelineData = (extractedArrays[0] as any[]).map((pipeline: any) => ({
              id: pipeline.id,
              name: pipeline.name,
              stageId: pipeline.stages.find((stage: any) => stage.position === 0)?.id || ''
            }));
          }
        }

        setPipelines(pipelineData);
      } catch (err) {
        console.error('Error fetching pipelines:', err);
      } finally {
        setLoadingPipelines(false);
      }
    }
    fetchPipelines();
  }, []);

  // Close dropdown when clicking outside (unchanged)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // File upload handler remains unchanged
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const binaryString = evt.target?.result;
        const workbook = XLSX.read(binaryString, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        if (data.length === 0) {
          setError('The file appears to be empty.');
          return;
        }

        const firstRow = data[0] as any;
        if (
          !firstRow['Phone'] &&
          !firstRow['phone'] &&
          !firstRow['Phone Number'] &&
          !firstRow['phone number'] &&
          !firstRow['Email'] &&
          !firstRow['email']
        ) {
          setError('The file must have either a "Phone" or "Email" column.');
          return;
        }

        const parsedContacts: Contact[] = data
          .map((row: any) => {
            const name = row['Contact Name'] || row['contact name'] || row['name'] || row['Name'] || '  ';
            const nameParts = name.trim().split(/\s+/);
            const firstName = row['First Name'] || row['first name'] || nameParts[0] || '';
            const lastName = row['Last Name'] || row['last name'] || nameParts.slice(1).join(' ') || '';
            const phone = row['Phone'] || row['phone'] || row['Phone Number'] || row['phone number'] || '';
            const street = row['Street'] || row['street'] || '';
            const city = row['City'] || row['city'] || '';
            const state = row['State'] || row['state'] || '';
            const email = row['Email'] || row['email'] || '';
            const notes = row['Notes'] || row['notes'] || '';
            const zipCode = row['Zip Code'] || row['zip code'] || row['zipcode'] || row['Zipcode'] || row['ZipCode'] || '';

            return {
              name: name.toString(),
              firstName: firstName.toString(),
              lastName: lastName.toString(),
              phone: phone.toString(),
              street: street.toString(),
              city: city.toString(),
              state: state.toString(),
              email: email.toString(),
              notes: notes.toString(),
              selected: true,
              zipCode: zipCode.toString()
            };
          })
          .filter((contact) => {
            const isValid = contact.phone || contact.email;
            if (!isValid) {
              console.warn(`Skipping contact "${contact.firstName}" due to missing phone and email.`);
            }
            return isValid;
          });

        if (parsedContacts.length === 0) {
          setError('No valid contacts found. Each contact must have at least a phone or email.');
          return;
        }

        setContacts(parsedContacts);
        if (parsedContacts.length < data.length) {
          setError(
            `${data.length - parsedContacts.length} contact(s) skipped due to missing phone and email.`
          );
        }
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        setError('Failed to parse the Excel file. Please ensure it\'s valid.');
      }
    };

    reader.onerror = () => setError('Failed to read the file. Please try again.');
    reader.readAsBinaryString(file);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setContacts(contacts.map(contact => ({ ...contact, selected: isChecked })));
  };

  const handleSelectContact = (index: number, isChecked: boolean) => {
    const updatedContacts = [...contacts];
    updatedContacts[index].selected = isChecked;
    setContacts(updatedContacts);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPipeline) {
      setError('Please select a pipeline for these contacts.');
      return;
    }

    const selectedPipelineData = pipelines.find(p => p.id === selectedPipeline);
    if (!selectedPipelineData) {
      setError('Selected pipeline not found.');
      return;
    }

    const selectedContacts = contacts
      .filter(contact => contact.selected)
      .map(({ firstName, lastName, phone, street, city, state, email, notes, zipCode }) => ({
        name: `${firstName} ${lastName}`.trim(),
        firstName,
        lastName,
        phone,
        street,
        city,
        state,
        email,
        notes,
        pipelineId: selectedPipeline,
        stageId: selectedPipelineData.stageId, // Include stageId
        zipCode,
      }));

    if (selectedContacts.length === 0) {
      setError('Please select at least one contact.');
      return;
    }

    const invalidContacts = selectedContacts.filter(c => !c.phone && !c.email);
    if (invalidContacts.length > 0) {
      setError(`The following contacts are missing both phone and email: ${invalidContacts.map(c => c.firstName).join(', ')}. At least one is required.`);
      return;
    }

    onContactsSelect(selectedContacts);
  };

  const handleReset = () => {
    setContacts([]);
    setFileName('');
    setError(null);
    setSelectedPipeline('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const allSelected = contacts.length > 0 && contacts.every(contact => contact.selected);
  const someSelected = contacts.some(contact => contact.selected);
  const hasPipelines = pipelines && pipelines.length > 0;

  const handleSelectPipeline = (pipelineId: string) => {
    setSelectedPipeline(pipelineId);
    setDropdownOpen(false);
  };

  const handleDownloadSample = () => {
    const sampleData = [
      {
        'First Name': 'John',
        'Last Name': 'Doe',
        'Phone': '+1234567890',
        'Street': '123 Main St',
        'City': 'New York',
        'State': 'NY',
        'Zip Code': '10001',
        'Email': 'john@example.com',
        'Notes': 'Interested in property'
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Contacts');
    XLSX.writeFile(wb, 'contact_upload_template.xlsx');
  };

  // JSX remains mostly unchanged
  return (
    <div className="nextprop-card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-[#1e1b4b]">Bulk Upload Contacts</h3>
        <div className="text-[#7c3aed] bg-purple-50 p-3 rounded-full">
          <DocumentTextIcon className="w-5 h-5" />
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <div className="space-y-2">
           
            <div className="flex items-start">
              <Dropdown
                label="Select Pipeline"
                value={selectedPipeline}
                onChange={handleSelectPipeline}
                options={pipelines.map(pipeline => ({
                  value: pipeline.id,
                  label: pipeline.name,
                  icon: <TagIcon className="h-5 w-5" />
                }))}
                placeholder="Select a pipeline"
                disabled={loadingPipelines}
                error={!hasPipelines && !loadingPipelines ? "No pipelines available. Please create a pipeline first." : undefined}
                required
                width="md"
              />
            </div>
            {selectedPipeline && (
              <div className="flex items-center mt-2 bg-purple-50 p-2 rounded-md max-w-md">
                <div className="w-3 h-3 rounded-full bg-[#7c3aed] mr-2"></div>
                <p className="text-xs text-gray-700 truncate">
                  <span className="font-medium">Selected Pipeline:</span> {pipelines.find(p => p.id === selectedPipeline)?.name || 'Unknown'}
                </p>
              </div>
            )}
            <p className="text-xs text-gray-500 italic mt-1">
              Contacts will be tagged with the selected pipeline and saved to your contacts page
            </p>
          </div>

          {contacts.length === 0 ? (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center">
                <input
                  type="file"
                  id="excelFile"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                />
                <label
                  htmlFor="excelFile"
                  className="cursor-pointer flex flex-col items-center justify-center"
                >
                  <DocumentTextIcon className="w-10 h-10 text-gray-400 mb-2" />
                  <span className="text-sm font-medium text-[#7c3aed]">Click to upload Excel file</span>
                  <span className="text-xs text-gray-500 mt-1">XLSX, XLS, or CSV</span>
                </label>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-700">Required Format (Phone or Email required):</h4>
                  <button
                    type="button"
                    onClick={handleDownloadSample}
                    className="text-sm text-[#7c3aed] hover:text-[#6d28d9] flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Sample
                  </button>
                </div>
                <div className="bg-gray-50 p-3 rounded-md overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 border border-gray-200">First Name</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 border border-gray-200">Last Name</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 border border-gray-200">Phone</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 border border-gray-200">Street</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 border border-gray-200">City</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 border border-gray-200">State</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 border border-gray-200">Email</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 border border-gray-200">Notes</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 border border-gray-200">Zip Code</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-3 py-2 border border-gray-200">Kelly</td>
                        <td className="px-3 py-2 border border-gray-200">Price</td>
                        <td className="px-3 py-2 border border-gray-200">+18167505325</td>
                        <td className="px-3 py-2 border border-gray-200">Oak Avenue</td>
                        <td className="px-3 py-2 border border-gray-200">Kansas City</td>
                        <td className="px-3 py-2 border border-gray-200">Missouri</td>
                        <td className="px-3 py-2 border border-gray-200">kelly@example.com</td>
                        <td className="px-3 py-2 border border-gray-200">Interested in 3-bedroom</td>
                        <td className="px-3 py-2 border border-gray-200">64108</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    Uploaded: {fileName}
                  </span>
                  <p className="text-xs text-gray-500">
                    {contacts.length} contacts found, {contacts.filter(c => c.selected).length} selected
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-sm text-[#7c3aed] hover:text-[#6d28d9]"
                >
                  Upload Different File
                </button>
              </div>
              <div className="border border-gray-200 rounded-md overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 flex items-center">
                  <input
                    type="checkbox"
                    id="selectAll"
                    checked={allSelected}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-[#7c3aed] rounded border-gray-300 focus:ring-[#7c3aed]"
                  />
                  <label htmlFor="selectAll" className="ml-2 text-sm font-medium text-gray-700">
                    Select All
                  </label>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="w-16 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">First Name</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Name</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Street</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">City</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">State</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Zip Code</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {contacts.map((contact, index) => (
                        <tr key={index} className={contact.selected ? 'bg-[#f5f3ff]' : ''}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={contact.selected}
                              onChange={(e) => handleSelectContact(index, e.target.checked)}
                              className="h-4 w-4 text-[#7c3aed] rounded border-gray-300 focus:ring-[#7c3aed]"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{contact.firstName || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{contact.lastName || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{contact.phone || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{contact.street || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{contact.city || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{contact.state || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{contact.email || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{contact.zipCode || '-'}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {error && (
            <div className="bg-red-50 p-4 rounded-md text-red-800">
              <p>{error}</p>
            </div>
          )}
          {contacts.length > 0 && (
            <button
              type="submit"
              disabled={isLoading || !someSelected || !selectedPipeline}
              className={`nextprop-button w-full flex justify-center items-center ${(!someSelected || !selectedPipeline) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-4 h-4 mr-2" />
                  Add to {selectedPipeline ? pipelines.find(p => p.id === selectedPipeline)?.name : ''} Pipeline ({contacts.filter(c => c.selected).length})
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}