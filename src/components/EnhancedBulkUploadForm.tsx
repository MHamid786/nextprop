'use client';

import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import CreatableSelect from 'react-select/creatable';
import { DocumentTextIcon, CheckCircleIcon, TagIcon } from '@heroicons/react/24/outline';
import { uploadFile } from '@/utils/uploadFileUtils';
import { useAuth } from '@/contexts/AuthContext';
import { Pipeline } from '@/types';

interface FileColumn {
  fileColumn: string;
  examples: string[];
  documentType: string;
  column: string | null;
}

interface Property {
  option: string;
  value: string;
  documentType: string;
  id?: string;
  type?: string;
}

interface MappedField {
  csvColumn: string;
  examples: string[];
  objectType: 'contact' | 'opportunity' | '';
  mappedTo: string;
  isLocked?: boolean;
}

interface BulkUploadFormProps {
  onContactsSelect?: (contacts: any[]) => void;
  isLoading?: boolean;
  pipelines?: Pipeline[];
}

export default function EnhancedBulkUploadForm({ onContactsSelect, isLoading = false, pipelines: initialPipelines = [] }: BulkUploadFormProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [selectedPipeline, setSelectedPipeline] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<{ value: string; label: string }[]>([]);
  const [filePath, setFilePath] = useState<string>('');
  const [importRequestId, setImportRequestId] = useState<string>('');
  const [fileColumns, setFileColumns] = useState<FileColumn[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [mappedFields, setMappedFields] = useState<MappedField[]>([]);
  const [availableTags, setAvailableTags] = useState<{ value: string; label: string }[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [showPopup, setShowPopup] = useState(false); // State for popup visibility

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pipelines, setPipelines] = useState<Pipeline[]>(initialPipelines);
  const [loadingPipelines, setLoadingPipelines] = useState(false);
  const [hasFetchedPipelines, setHasFetchedPipelines] = useState(initialPipelines.length > 0);

  // Fetch pipelines
  useEffect(() => {
    async function fetchPipelines() {
      try {
        setLoadingPipelines(true);
        const response = await fetch('/api/pipelines');
        if (!response.ok) throw new Error('Failed to fetch pipelines');
        const data = await response.json();
        const pipelineData = data.pipelines as Pipeline[];
        setPipelines(pipelineData);
        setHasFetchedPipelines(true);
      } catch (err) {
        console.error('Error fetching pipelines:', err);
        setError('Failed to load pipelines. Please try again.');
      } finally {
        setLoadingPipelines(false);
      }
    }

    if (initialPipelines.length === 0 && !hasFetchedPipelines) {
      fetchPipelines();
    }
  }, [initialPipelines, hasFetchedPipelines]);

  // Fetch available tags
  useEffect(() => {
    async function fetchTags() {
      try {
        setLoadingTags(true);
        const response = await fetch('/api/tags');
        if (!response.ok) throw new Error('Failed to fetch tags');
        const data = await response.json();
        console.log(`Tags: ${JSON.stringify(data)}`);
        const tags = data.tags.map((tag: any) => ({ value: tag.name, label: tag.name }));
        setAvailableTags(tags);
      } catch (err) {
        console.error('Error fetching tags:', err);
        setError('Failed to load tags. Please try again.');
      } finally {
        setLoadingTags(false);
      }
    }
    fetchTags();
  }, []);

  // Step 1: Handle file upload with pipeline/stage/opportunityName injection
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedPipeline) {
      setError('Please select a pipeline before uploading a file.');
      return;
    }

    setFileName(file.name);

    try {
      const selectedPipelineData = pipelines.find((p) => p.id === selectedPipeline);
      if (!selectedPipelineData) throw new Error('Selected pipeline not found.');

      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      const headers = jsonData[0] as string[];
      const firstNameIdx = headers.findIndex((h) => h.toLowerCase().includes('first') || h.toLowerCase().includes('name'));
      const streetIdx = headers.indexOf('Street');
      const cityIdx = headers.indexOf('City');
      const stateIdx = headers.indexOf('State');
      const zipCodeIdx = headers.findIndex((h) => h.toLowerCase().includes('zip') || h.toLowerCase().includes('postal'));

      if (firstNameIdx === -1) {
        throw new Error('CSV must contain a "First Name" or "Name" column for opportunityName.');
      }

      const newHeaders = [...headers, 'Pipeline', 'Stage', 'opportunityName'];
      const pipelineName = selectedPipelineData.name;
      const stageName = selectedPipelineData!.stages![0]?.name || '';

      const modifiedData = [
        newHeaders,
        ...jsonData.slice(1).map((row) => {
          const firstName = row[firstNameIdx] || '';
          const street = streetIdx !== -1 ? row[streetIdx] || '' : '';
          const city = cityIdx !== -1 ? row[cityIdx] || '' : '';
          const state = stateIdx !== -1 ? row[stateIdx] || '' : '';
          const zipCode = zipCodeIdx !== -1 ? row[zipCodeIdx] || '' : '';

          const opportunityNameParts = [firstName];
          if (street) opportunityNameParts.push(street);
          if (city) opportunityNameParts.push(city);
          if (state) opportunityNameParts.push(state);
          if (zipCode) opportunityNameParts.push(zipCode);
          const opportunityName = opportunityNameParts.filter(Boolean).join(' - ');

          return [...row, pipelineName, stageName, opportunityName];
        }),
      ];

      const newWorksheet = XLSX.utils.aoa_to_sheet(modifiedData);
      const newWorkbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Sheet1');
      const csvData = XLSX.write(newWorkbook, { bookType: 'csv', type: 'array' });
      const modifiedFile = new File([new Uint8Array(csvData)], `${file.name.split('.')[0]}_modified.csv`, {
        type: 'text/csv',
      });

      const uploadedFilePath = await uploadFile(modifiedFile, `location/${user?.locationId}/bulk-import/${crypto.randomUUID()}`);
      setFilePath(uploadedFilePath);

      const step1Response = await fetch('/api/bulk-actions/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          step: 1,
          filePath: uploadedFilePath,
          locationId: user?.locationId,
          documentType: 'contact_opportunity',
        }),
      });

      const step1Data = await step1Response.json();
      if (!step1Response.ok) throw new Error(step1Data.message || 'Step 1 API failed');

      setFileColumns(step1Data.fileData || []);
      setProperties(step1Data.properties || []);
      setImportRequestId(step1Data.importRequestId || '');

      const initialMappedFields = (step1Data.fileData || []).map((col: FileColumn) => ({
        csvColumn: col.fileColumn,
        examples: col.examples,
        objectType: col.documentType as 'contact' | 'opportunity' | '',
        mappedTo: col.column || '',
        isLocked: col.fileColumn === 'Pipeline' || col.fileColumn === 'Stage' || col.fileColumn === 'opportunityName',
      }));

      setMappedFields(initialMappedFields);
      setStep(2);
    } catch (error) {
      console.error('Error in Step 1:', error);
      setError(error instanceof Error ? error.message : 'Failed to process file upload. Please try again.');
    }
  };

  // Handle object type change
  const handleObjectTypeChange = (csvColumn: string, objectType: 'contact' | 'opportunity' | '') => {
    setMappedFields((prev) =>
      prev.map((field) =>
        field.csvColumn === csvColumn && !field.isLocked
          ? { ...field, objectType, mappedTo: '' }
          : field
      )
    );
  };

  // Handle field mapping change
  const handleMappingChange = (csvColumn: string, mappedValue: string) => {
    setMappedFields((prev) =>
      prev.map((field) =>
        field.csvColumn === csvColumn && !field.isLocked ? { ...field, mappedTo: mappedValue } : field
      )
    );
  };

  // Handle tag selection change (including custom tags)
  const handleTagChange = (selectedOptions: any) => {
    setSelectedTags(selectedOptions || []);
  };

  // Step 2: Submit mapping
  const handleSubmitMapping = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPipeline) {
      setError('Please select a pipeline.');
      return;
    }

    const keyMap = {
      contact: mappedFields
        .filter((field) => field.objectType === 'contact' && field.mappedTo)
        .reduce((acc, field) => {
          acc[field.csvColumn] = field.mappedTo;
          return acc;
        }, {} as Record<string, string>),
      opportunity: mappedFields
        .filter((field) => field.objectType === 'opportunity' && field.mappedTo)
        .reduce((acc, field) => {
          acc[field.csvColumn] = field.mappedTo;
          return acc;
        }, {} as Record<string, string>),
    };

    try {
      const step2Response = await fetch('/api/bulk-actions/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          step: 2,
          importRequestId,
          locationId: user?.locationId,
          documentType: 'contact_opportunity',
          notUpdateEmptyValuesList: ['name', 'phone', 'city', 'state', 'email', 'notes', 'pipelineStage', 'opportunityName', 'opportunityId', 'pipeline'],
          keyMap,
          importName: `${fileName}-${new Date().toISOString().replace(/:/g, '_')}`,
          createSmartList: false,
          smartlistName: new Date().toISOString().replace(/:/g, '_'),
          conflictResolution: {
            contact: { type: 'BOTH' },
            opportunity: { type: 'CREATE' },
          },
          tags: selectedTags.map((tag) => tag.value),
          validateEmail: false,
        }),
      });

      const step2Data = await step2Response.json();
      if (!step2Response.ok) throw new Error(step2Data.message || 'Step 2 API failed');

      console.log('Import successful:', step2Data);
      setShowPopup(true); // Show popup on success
      if (onContactsSelect) onContactsSelect([]);
      // Do not call handleReset() immediately; let user interact with popup
    } catch (error) {
      console.error('Error in Step 2:', error);
      setError('Failed to submit import. Please try again.');
    }
  };

  const handleReset = () => {
    setStep(1);
    setFileName('');
    setError(null);
    setSelectedPipeline('');
    setSelectedTags([]);
    setFilePath('');
    setImportRequestId('');
    setFileColumns([]);
    setProperties([]);
    setMappedFields([]);
    setShowPopup(false); // Close popup when resetting
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCheckProgress = () => {
    console.log('Checking progress for importRequestId:', importRequestId);
    // Add logic here to navigate to a progress page or fetch progress status
    // For now, just log the importRequestId
    setShowPopup(false); // Close popup after checking progress
    // Navigate to a progress page or fetch progress status
    window.location.href = '/bulk-actions';

  };

  return (
    <div className="nextprop-card p-6">
      <h3 className="text-lg font-semibold text-[#1e1b4b] mb-6">Bulk Upload Contacts</h3>

      <form onSubmit={step === 1 ? (e) => e.preventDefault() : handleSubmitMapping}>
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Pipeline</label>
              <select
                value={selectedPipeline}
                onChange={(e) => setSelectedPipeline(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2"
                disabled={loadingPipelines}
              >
                <option value="">Select a pipeline</option>
                {pipelines.map((pipeline) => (
                  <option key={pipeline.id} value={pipeline.id}>
                    {pipeline.name}
                  </option>
                ))}
              </select>
              {loadingPipelines && <p className="text-sm text-gray-500">Loading pipelines...</p>}
              {pipelines.length === 0 && !loadingPipelines && (
                <p className="text-sm text-red-500">No pipelines available. Please create one first.</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select or Add Tags</label>
              <CreatableSelect
                isMulti
                options={availableTags}
                value={selectedTags}
                onChange={handleTagChange}
                className="basic-multi-select"
                classNamePrefix="select"
                placeholder="Select or type to add tags..."
                isLoading={loadingTags}
                formatCreateLabel={(inputValue) => `Add "${inputValue}"`}
              />
              {loadingTags && <p className="text-sm text-gray-500">Loading tags...</p>}
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center">
              <input
                type="file"
                id="excelFile"
                ref={fileInputRef}
                className="hidden"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
              />
              <label htmlFor="excelFile" className="cursor-pointer flex flex-col items-center justify-center">
                <DocumentTextIcon className="w-10 h-10 text-gray-400 mb-2" />
                <span className="text-sm font-medium text-[#7c3aed]">Click to upload Excel file</span>
                <span className="text-xs text-gray-500 mt-1">XLSX, XLS, or CSV</span>
              </label>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <p className="text-sm text-gray-700">Uploaded: {fileName}</p>
              <button type="button" onClick={handleReset} className="text-sm text-[#7c3aed] hover:text-[#6d28d9]">
                Upload Different File
              </button>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Map Your Columns</h4>
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-2 text-left text-sm font-medium text-gray-700">CSV Column</th>
                    <th className="border border-gray-300 p-2 text-left text-sm font-medium text-gray-700">Examples</th>
                    <th className="border border-gray-300 p-2 text-left text-sm font-medium text-gray-700">Object</th>
                    <th className="border border-gray-300 p-2 text-left text-sm font-medium text-gray-700">Map To</th>
                  </tr>
                </thead>
                <tbody>
                  {mappedFields.map((field) => (
                    <tr key={field.csvColumn}>
                      <td className="border border-gray-300 p-2 text-sm">{field.csvColumn}</td>
                      <td className="border border-gray-300 p-2 text-sm text-gray-500">
                        {field.examples.filter(Boolean).join(', ') || 'N/A'}
                      </td>
                      <td className="border border-gray-300 p-2">
                        <select
                          className="w-full border border-gray-300 rounded-md p-1"
                          value={field.objectType}
                          onChange={(e) =>
                            handleObjectTypeChange(field.csvColumn, e.target.value as 'contact' | 'opportunity' | '')
                          }
                          disabled={field.isLocked}
                        >
                          <option value="">Select object</option>
                          <option value="contact">Contact</option>
                          <option value="opportunity">Opportunity</option>
                        </select>
                      </td>
                      <td className="border border-gray-300 p-2">
                        <select
                          className="w-full border border-gray-300 rounded-md p-1"
                          value={field.mappedTo}
                          onChange={(e) => handleMappingChange(field.csvColumn, e.target.value)}
                          disabled={!field.objectType || field.isLocked}
                        >
                          <option value="">Select field</option>
                          {field.objectType &&
                            properties
                              .filter((prop) => prop.documentType === field.objectType)
                              .map((prop) => (
                                <option key={prop.value} value={prop.value}>
                                  {prop.option}
                                </option>
                              ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="submit"
              disabled={isLoading || !selectedPipeline}
              className={`w-full py-2 px-4 bg-[#7c3aed] text-white rounded-md ${isLoading || !selectedPipeline ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading ? 'Processing...' : 'Import Contacts'}
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 p-4 rounded-md text-red-800 mt-4">
            <p>{error}</p>
          </div>
        )}
      </form>

      {/* Popup */}
      {showPopup && (
        <div className="fixed inset-0 backdrop-filter backdrop-blur-md bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-md shadow-lg max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Import in Progress</h3>
            <p className="text-sm text-gray-600 mb-6">
              Bulk upload is in progress. You can check the progress at any time by clicking the "Check Progress" button.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={handleReset}
                className="py-2 px-4 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
              >
                Close
              </button>
              <button
                onClick={handleCheckProgress}
                className="py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                Check Progress
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}