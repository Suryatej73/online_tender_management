import React, { useState, useEffect } from 'react';
import {
  FileText, UploadCloud, Shield, CheckCircle2, AlertTriangle,
  Clock, Eye, Download, RefreshCw, Search, Plus, Filter,
  Lock, Cpu, Archive, FileCode, Check, X, AlertOctagon,
  FileCheck, Layers, ExternalLink, HardDrive, ShieldAlert, Sparkles
} from 'lucide-react';
import { documentsApi } from '../../api/documentsApi';

export default function DocumentManagementDashboard({ currentUser }) {
  const [activeTab, setActiveTab] = useState('repository');
  const [documents, setDocuments] = useState([]);
  const [docTypes, setDocTypes] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [expiringDocs, setExpiringDocs] = useState([]);
  const [storageHealth, setStorageHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedOwnerType, setSelectedOwnerType] = useState('');

  // Modals & Drawers
  const [viewerDoc, setViewerDoc] = useState(null);
  const [viewerData, setViewerData] = useState(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [selectedDocForVerify, setSelectedDocForVerify] = useState(null);
  const [verifyStatusChoice, setVerifyStatusChoice] = useState('VERIFIED');
  const [verifyReason, setVerifyReason] = useState('');

  // Upload Form State
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDocType, setUploadDocType] = useState('');
  const [uploadOwnerType, setUploadOwnerType] = useState('TENDER');
  const [uploadOwnerId, setUploadOwnerId] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadExpiry, setUploadExpiry] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Bulk Upload State
  const [bulkFiles, setBulkFiles] = useState([]);
  const [bulkUploadProgress, setBulkUploadProgress] = useState({});

  // Template Generation State
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateContext, setTemplateContext] = useState({
    tender: { title: 'Solar Power Plant Procurement', reference: 'TND-2026-000412' },
    vendor: { name: 'SunEnergy Solutions Ltd', gst_number: '27AABCS1429B1Z' },
    organization: { name: 'National Renewable Energy Authority' },
    contract: { amount: '4,500,000.00' }
  });

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [docsRes, typesRes, expRes, tmplRes, healthRes] = await Promise.all([
        documentsApi.getDocuments({
          search: searchQuery,
          document_type: selectedType,
          status: selectedStatus,
          owner_type: selectedOwnerType,
        }),
        documentsApi.getDocumentTypes(),
        documentsApi.getExpiringDocuments(30),
        documentsApi.getTemplates(),
        documentsApi.checkStorageHealth().catch(() => null)
      ]);

      if (docsRes.success) setDocuments(docsRes.data || []);
      if (typesRes.success) setDocTypes(typesRes.data || []);
      if (expRes.success) setExpiringDocs(expRes.data || []);
      if (tmplRes.success) setTemplates(tmplRes.data || []);
      if (healthRes) setStorageHealth(healthRes);
    } catch (err) {
      showNotification('Failed to fetch document repository data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchQuery, selectedType, selectedStatus, selectedOwnerType]);

  // Handle Document Viewer
  const handleOpenViewer = async (doc) => {
    setViewerDoc(doc);
    setViewerLoading(true);
    try {
      const res = await documentsApi.getViewerData(doc.id);
      if (res.success) {
        setViewerData(res.data);
      } else {
        showNotification(res.error?.message || 'Failed to load preview', 'error');
      }
    } catch (err) {
      showNotification('Error loading document viewer', 'error');
    } finally {
      setViewerLoading(false);
    }
  };

  // Handle Download
  const handleDownload = async (doc) => {
    try {
      const res = await documentsApi.getDownloadUrl(doc.id);
      if (res.success && res.data?.download_url) {
        window.open(res.data.download_url, '_blank');
        showNotification(`Downloading ${doc.original_filename}...`);
      } else {
        showNotification(res.error?.message || 'Download permission denied or file quarantined', 'error');
      }
    } catch (err) {
      showNotification('Download failed', 'error');
    }
  };

  // Handle Single Upload
  const handleSingleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      showNotification('Please select a file to upload', 'error');
      return;
    }

    setIsUploading(true);
    try {
      // 1. Initiate upload
      const initRes = await documentsApi.initiateUpload({
        title: uploadTitle || uploadFile.name,
        original_filename: uploadFile.name,
        file_size: uploadFile.size,
        mime_type: uploadFile.type || 'application/pdf',
        owner_type: uploadOwnerType,
        owner_id: uploadOwnerId,
        document_type: uploadDocType || null,
        description: uploadDescription,
        expires_at: uploadExpiry || null
      });

      if (!initRes.success) {
        showNotification(initRes.error || 'Failed to initiate upload', 'error');
        setIsUploading(false);
        return;
      }

      const docId = initRes.data.document_id;

      // 2. Complete upload with direct file multipart
      const formData = new FormData();
      formData.append('document_id', docId);
      formData.append('file', uploadFile);

      const completeRes = await documentsApi.completeUpload(formData);
      if (completeRes.success) {
        showNotification(`Document '${uploadFile.name}' uploaded and queued for security scanning & OCR!`);
        setIsUploadModalOpen(false);
        setUploadFile(null);
        setUploadTitle('');
        setUploadDescription('');
        loadData();
      } else {
        showNotification(completeRes.error || 'Failed to complete upload', 'error');
      }
    } catch (err) {
      showNotification('Upload pipeline error: ' + err.message, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Bulk Upload
  const handleBulkFilesAdded = (e) => {
    const files = Array.from(e.target.files);
    setBulkFiles(files);
  };

  const handleRunBulkUpload = async () => {
    if (!bulkFiles.length) return;
    setIsUploading(true);

    for (let i = 0; i < bulkFiles.length; i++) {
      const file = bulkFiles[i];
      setBulkUploadProgress(prev => ({ ...prev, [file.name]: 'Uploading...' }));

      try {
        const initRes = await documentsApi.initiateUpload({
          title: file.name.replace(/\.[^/.]+$/, ''),
          original_filename: file.name,
          file_size: file.size,
          mime_type: file.type || 'application/pdf',
          owner_type: 'TENDER',
        });

        if (initRes.success) {
          const formData = new FormData();
          formData.append('document_id', initRes.data.document_id);
          formData.append('file', file);
          await documentsApi.completeUpload(formData);
          setBulkUploadProgress(prev => ({ ...prev, [file.name]: 'Complete ✓' }));
        } else {
          setBulkUploadProgress(prev => ({ ...prev, [file.name]: 'Failed ✕' }));
        }
      } catch (err) {
        setBulkUploadProgress(prev => ({ ...prev, [file.name]: 'Error ✕' }));
      }
    }

    setIsUploading(false);
    showNotification('Bulk upload batch processed!');
    loadData();
  };

  // Handle Verification
  const handleVerifySubmit = async () => {
    if (!selectedDocForVerify) return;
    try {
      const res = await documentsApi.verifyDocument(
        selectedDocForVerify.id,
        verifyStatusChoice,
        verifyReason
      );
      if (res.success) {
        showNotification(`Document status updated to ${verifyStatusChoice}`);
        setIsVerifyModalOpen(false);
        setSelectedDocForVerify(null);
        loadData();
      } else {
        showNotification(res.message || 'Verification update failed', 'error');
      }
    } catch (err) {
      showNotification('Verification request error', 'error');
    }
  };

  // Handle Template Generation
  const handleGenerateDocument = async (tmpl) => {
    try {
      showNotification(`Generating document from template ${tmpl.name}...`);
      const res = await documentsApi.generateFromTemplate(tmpl.id, {
        context_data: templateContext,
        title: `Official ${tmpl.name}`,
        owner_type: 'TENDER'
      });
      if (res.success) {
        showNotification(`Official document '${res.data.title}' generated and stored in S3!`);
        loadData();
        setActiveTab('repository');
      } else {
        showNotification(res.error || 'Failed to generate document', 'error');
      }
    } catch (err) {
      showNotification('Template generation error', 'error');
    }
  };

  // Metrics calculations
  const totalDocs = documents.length;
  const verifiedCount = documents.filter(d => d.verification_status === 'VERIFIED').length;
  const ocrDoneCount = documents.filter(d => d.ocr_status === 'COMPLETED').length;
  const quarantinedCount = documents.filter(d => d.scan_status === 'INFECTED' || d.scan_status === 'QUARANTINED').length;
  const pendingScanCount = documents.filter(d => d.scan_status === 'PENDING_SCAN' || d.lifecycle_status === 'SCANNING').length;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-2xl flex items-center space-x-2 border ${
          notification.type === 'error'
            ? 'bg-red-950/90 border-red-500 text-red-200'
            : 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
        }`}>
          {notification.type === 'error' ? <AlertTriangle className="w-5 h-5 text-red-400" /> : <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          <span className="font-medium text-sm">{notification.msg}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-600/20 border border-blue-500/40 rounded-xl text-blue-400">
              <FileText className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                Document Center
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Module 8 Production
                </span>
              </h1>
              <p className="text-slate-400 text-sm mt-0.5">
                Secure S3 Storage, Cryptographic Integrity, OCR Text Extraction & Intelligence Engine
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 transition"
            title="Refresh repository"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
          </button>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 py-2.5 rounded-lg font-medium text-sm shadow-lg shadow-blue-900/30 transition border border-blue-500/30"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 md:gap-4 my-6">
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>Total Docs</span>
            <FileText className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{totalDocs}</p>
          <p className="text-xs text-slate-500 mt-1">Multi-tenant repository</p>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>Verified</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-2">{verifiedCount}</p>
          <p className="text-xs text-slate-500 mt-1">Compliance approved</p>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>OCR Indexed</span>
            <Cpu className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-purple-400 mt-2">{ocrDoneCount}</p>
          <p className="text-xs text-slate-500 mt-1">Text extracted & searchable</p>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>Expiring Soon</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400 mt-2">{expiringDocs.length}</p>
          <p className="text-xs text-slate-500 mt-1">&lt; 30 days remaining</p>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>Quarantined</span>
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-2xl font-bold text-red-400 mt-2">{quarantinedCount}</p>
          <p className="text-xs text-slate-500 mt-1">Malicious payload blocked</p>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>Storage Cloud</span>
            <HardDrive className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-sm font-bold text-sky-400 mt-2 truncate">
            {storageHealth?.storage_provider || 'S3 / Local KMS'}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[10px] text-emerald-400 font-medium uppercase tracking-wider">
              {storageHealth?.status || 'Active'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 mb-6 gap-2">
        {[
          { id: 'repository', label: 'Document Repository', icon: Layers },
          { id: 'bulk', label: 'Bulk Uploader', icon: UploadCloud },
          { id: 'expiring', label: `Expiring Alerts (${expiringDocs.length})`, icon: Clock },
          { id: 'templates', label: 'Template Library', icon: FileCode },
          { id: 'security', label: 'Cloud Security & Integrity', icon: Shield }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition -mb-px ${
                isActive
                  ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: REPOSITORY TABLE */}
      {activeTab === 'repository' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/60 flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Search title, filename, OCR text..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={selectedType}
                onChange={e => setSelectedType(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none"
              >
                <option value="">All Document Types</option>
                {docTypes.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none"
              >
                <option value="">All Lifecycles</option>
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="VERIFICATION">VERIFICATION</option>
                <option value="OCR_PROCESSING">OCR_PROCESSING</option>
                <option value="SCANNING">SCANNING</option>
                <option value="QUARANTINED">QUARANTINED</option>
                <option value="EXPIRED">EXPIRED</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>

              <select
                value={selectedOwnerType}
                onChange={e => setSelectedOwnerType(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none"
              >
                <option value="">All Owners</option>
                <option value="TENDER">Tender</option>
                <option value="VENDOR">Vendor</option>
                <option value="BID">Bid</option>
                <option value="ORGANIZATION">Organization</option>
                <option value="CONTRACT">Contract</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-slate-800/40 rounded-xl border border-slate-700/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/60 text-xs uppercase font-semibold text-slate-400 border-b border-slate-700">
                  <tr>
                    <th className="px-4 py-3.5">Document</th>
                    <th className="px-4 py-3.5">Type & Owner</th>
                    <th className="px-4 py-3.5">Version</th>
                    <th className="px-4 py-3.5">Size</th>
                    <th className="px-4 py-3.5">Scan / Malware</th>
                    <th className="px-4 py-3.5">OCR Status</th>
                    <th className="px-4 py-3.5">Verification</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {documents.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-4 py-12 text-center text-slate-500">
                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        No documents found matching the filter criteria.
                      </td>
                    </tr>
                  ) : (
                    documents.map(doc => (
                      <tr key={doc.id} className="hover:bg-slate-800/30 transition">
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-slate-700/50 rounded-lg text-blue-400 shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-white truncate max-w-xs">{doc.title}</p>
                              <p className="text-xs text-slate-500 truncate font-mono">{doc.original_filename}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300 font-medium">
                            {doc.document_type_name || 'General'}
                          </span>
                          <p className="text-[11px] text-slate-500 mt-0.5">{doc.owner_type}</p>
                        </td>

                        <td className="px-4 py-3">
                          <span className="text-xs font-mono font-semibold text-blue-400">v{doc.current_version}</span>
                        </td>

                        <td className="px-4 py-3 font-mono text-xs text-slate-400">
                          {(doc.file_size / 1024).toFixed(1)} KB
                        </td>

                        <td className="px-4 py-3">
                          {doc.scan_status === 'CLEAN' && (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                              <Check className="w-3.5 h-3.5" /> Clean
                            </span>
                          )}
                          {doc.scan_status === 'INFECTED' && (
                            <span className="inline-flex items-center gap-1 text-xs text-red-400 font-semibold animate-pulse">
                              <AlertOctagon className="w-3.5 h-3.5" /> Quarantined
                            </span>
                          )}
                          {doc.scan_status === 'PENDING_SCAN' && (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-400">
                              <Clock className="w-3.5 h-3.5" /> Scanning...
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {doc.ocr_status === 'COMPLETED' && (
                            <span className="text-xs px-2 py-0.5 rounded bg-purple-900/30 text-purple-400 border border-purple-800">
                              Extracted ✓
                            </span>
                          )}
                          {doc.ocr_status === 'REVIEW_REQUIRED' && (
                            <span className="text-xs px-2 py-0.5 rounded bg-amber-900/30 text-amber-400 border border-amber-800">
                              Review Req
                            </span>
                          )}
                          {doc.ocr_status === 'PROCESSING' && (
                            <span className="text-xs text-purple-400 animate-pulse">Processing...</span>
                          )}
                          {doc.ocr_status === 'SKIPPED' && (
                            <span className="text-xs text-slate-500">Skipped</span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                            doc.verification_status === 'VERIFIED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : doc.verification_status === 'REJECTED'
                              ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          }`}>
                            {doc.verification_status}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right space-x-1">
                          <button
                            onClick={() => handleOpenViewer(doc)}
                            className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-blue-400 transition"
                            title="Preview / Security Viewer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownload(doc)}
                            disabled={!doc.is_downloadable}
                            className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-emerald-400 transition disabled:opacity-30"
                            title={doc.is_downloadable ? "Authorized Download" : "Download Blocked"}
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedDocForVerify(doc);
                              setIsVerifyModalOpen(true);
                            }}
                            className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-purple-400 transition"
                            title="Verify Document"
                          >
                            <FileCheck className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BULK UPLOADER */}
      {activeTab === 'bulk' && (
        <div className="bg-slate-800/40 p-6 rounded-xl border border-slate-700/60 max-w-4xl mx-auto space-y-6">
          <div className="text-center">
            <UploadCloud className="w-12 h-12 text-blue-400 mx-auto mb-2" />
            <h2 className="text-lg font-bold text-white">Advanced Batch & Bulk Document Uploader</h2>
            <p className="text-slate-400 text-sm mt-1">
              Select multiple procurement documents for concurrent upload, checksum computation, and asynchronous scanning.
            </p>
          </div>

          <div className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-2xl p-8 text-center transition bg-slate-900/40">
            <input
              type="file"
              multiple
              onChange={handleBulkFilesAdded}
              id="bulk-file-input"
              className="hidden"
            />
            <label htmlFor="bulk-file-input" className="cursor-pointer space-y-2 block">
              <Plus className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="font-semibold text-blue-400">Click or Drag & Drop multiple files here</p>
              <p className="text-xs text-slate-500">Supports PDF, DOCX, XLSX, TXT, Images up to 50MB per file</p>
            </label>
          </div>

          {bulkFiles.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-300">File Queue ({bulkFiles.length} files)</h3>
                <button
                  onClick={handleRunBulkUpload}
                  disabled={isUploading}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow transition disabled:opacity-50"
                >
                  {isUploading ? 'Processing Batch...' : 'Start Batch Upload'}
                </button>
              </div>

              <div className="divide-y divide-slate-800 bg-slate-900/50 rounded-xl border border-slate-700/60 overflow-hidden">
                {bulkFiles.map((file, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2 truncate">
                      <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="font-medium text-slate-200 truncate">{file.name}</span>
                      <span className="text-slate-500">({(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <span className="font-mono text-blue-400 font-semibold">
                      {bulkUploadProgress[file.name] || 'Queued'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: EXPIRING DOCUMENTS ALERTS */}
      {activeTab === 'expiring' && (
        <div className="space-y-4">
          <div className="bg-amber-950/30 border border-amber-800/60 p-4 rounded-xl flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-amber-300">Expiring Compliance & Guarantee Documents</h3>
              <p className="text-xs text-amber-200/80 mt-1">
                The background Celery scheduler alerts administrators on 30, 15, 7, and 1-day horizons for contractor insurance, bank guarantees, and GST certificates.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {expiringDocs.map(doc => (
              <div key={doc.id} className="bg-slate-800/50 border border-slate-700/60 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-white text-sm">{doc.title}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{doc.original_filename}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Expires on: <span className="text-slate-300 font-mono">{new Date(doc.expires_at).toLocaleDateString()}</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
                    {doc.days_until_expiry !== null ? `${doc.days_until_expiry} days remaining` : 'Expiring'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: TEMPLATE LIBRARY */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(tmpl => (
              <div key={tmpl.id} className="bg-slate-800/50 border border-slate-700/60 p-5 rounded-xl flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-900/40 text-blue-400 border border-blue-800">
                      {tmpl.code}
                    </span>
                    <span className="text-xs text-slate-500">v{tmpl.version}</span>
                  </div>
                  <h3 className="font-bold text-white text-base">{tmpl.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">{tmpl.description || 'Standard procurement document template.'}</p>
                  <div className="mt-3 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-400 overflow-hidden line-clamp-3">
                    {tmpl.template_content}
                  </div>
                </div>

                <button
                  onClick={() => handleGenerateDocument(tmpl)}
                  className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold py-2 px-3 rounded-lg shadow transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Official Document</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: CLOUD SECURITY & INTEGRITY */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6 space-y-4">
            <div className="flex items-center space-x-3 text-blue-400">
              <Shield className="w-6 h-6" />
              <h3 className="font-bold text-white text-lg">Cloud Storage & KMS Architecture</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              OTMS Module 8 enforces AWS S3 private buckets with Server-Side Encryption (SSE-KMS) and strict block on public access. Temporary authorized presigned GET/PUT URLs ensure credentials are never exposed to browser clients.
            </p>

            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between p-2.5 bg-slate-900/60 rounded-lg text-xs">
                <span className="text-slate-400">Active Storage Provider:</span>
                <span className="font-mono text-emerald-400 font-semibold">{storageHealth?.storage_provider || 'S3StorageProvider'}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-900/60 rounded-lg text-xs">
                <span className="text-slate-400">Encryption at Rest:</span>
                <span className="font-mono text-emerald-400 font-semibold">{storageHealth?.encryption || 'SSE-KMS (256-bit)'}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-900/60 rounded-lg text-xs">
                <span className="text-slate-400">Transport Security:</span>
                <span className="font-mono text-emerald-400 font-semibold">TLS / HTTPS Enforced</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-900/60 rounded-lg text-xs">
                <span className="text-slate-400">Presigned Expiration:</span>
                <span className="font-mono text-blue-400 font-semibold">900 seconds (15 mins)</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6 space-y-4">
            <div className="flex items-center space-x-3 text-purple-400">
              <Cpu className="w-6 h-6" />
              <h3 className="font-bold text-white text-lg">OCR Intelligence & Malware Isolation</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every upload is inspected by our Antivirus scanner before OCR processing. Suspicious byte sequences trigger immediate quarantine, locking down all download and preview capabilities while dispatching alerts to security auditors.
            </p>

            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between p-2.5 bg-slate-900/60 rounded-lg text-xs">
                <span className="text-slate-400">Antivirus Pipeline:</span>
                <span className="font-mono text-emerald-400 font-semibold">Active & Quarantining</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-900/60 rounded-lg text-xs">
                <span className="text-slate-400">Integrity Hashing:</span>
                <span className="font-mono text-emerald-400 font-semibold">SHA-256 Checksum</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-900/60 rounded-lg text-xs">
                <span className="text-slate-400">OCR Confidence Threshold:</span>
                <span className="font-mono text-purple-400 font-semibold">&gt;= 70.0% (Review Required Below)</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-900/60 rounded-lg text-xs">
                <span className="text-slate-400">Multi-tenant Isolation:</span>
                <span className="font-mono text-blue-400 font-semibold">Strict Organization RBAC</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT VIEWER MODAL */}
      {viewerDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/40">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">{viewerDoc.title}</h3>
                  <p className="text-xs text-slate-400 font-mono">{viewerDoc.original_filename} (Version {viewerDoc.current_version})</p>
                </div>
              </div>
              <button
                onClick={() => { setViewerDoc(null); setViewerData(null); }}
                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {viewerLoading ? (
                <div className="py-20 text-center text-slate-400 animate-pulse">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-400" />
                  Generating temporary secure preview session...
                </div>
              ) : viewerData ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left Col: Security & Metadata */}
                  <div className="space-y-4">
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/60 space-y-3">
                      <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Shield className="w-4 h-4 text-blue-400" />
                        Cryptographic Security
                      </h4>
                      <div className="text-xs space-y-2">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Encryption:</span>
                          <span className="text-emerald-400 font-semibold">{viewerData.security_status?.encryption_at_rest}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Transport:</span>
                          <span className="text-emerald-400 font-semibold">{viewerData.security_status?.transport_security}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Malware Scan:</span>
                          <span className="text-emerald-400 font-semibold">{viewerData.security_status?.malware_scan}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-700">
                        <p className="text-[11px] text-slate-400 mb-1">SHA-256 Integrity Hash:</p>
                        <p className="font-mono text-[10px] text-slate-300 break-all bg-slate-900 p-2 rounded border border-slate-800">
                          {viewerData.security_status?.integrity_hash}
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/60 space-y-2 text-xs">
                      <h4 className="font-bold text-white uppercase tracking-wider text-xs">Metadata</h4>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Size:</span>
                        <span className="text-slate-200">{(viewerDoc.file_size / 1024).toFixed(1)} KB</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Owner:</span>
                        <span className="text-slate-200">{viewerDoc.owner_type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Created:</span>
                        <span className="text-slate-200">{new Date(viewerDoc.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDownload(viewerDoc)}
                      disabled={!viewerDoc.is_downloadable}
                      className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition disabled:opacity-30"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download File (Presigned S3)</span>
                    </button>
                  </div>

                  {/* Center/Right Col: OCR Text Panel */}
                  <div className="md:col-span-2 space-y-4">
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/60 flex flex-col h-full">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-700 mb-3">
                        <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                          <Cpu className="w-4 h-4 text-purple-400" />
                          Extracted OCR Intelligence
                        </h4>
                        <span className="text-xs px-2 py-0.5 rounded bg-purple-900/30 text-purple-300 font-mono">
                          Confidence: {viewerData.ocr_confidence ? `${viewerData.ocr_confidence.toFixed(1)}%` : 'N/A'}
                        </span>
                      </div>

                      <div className="flex-1 min-h-[250px] bg-slate-900 p-4 rounded-lg font-mono text-xs text-slate-300 overflow-y-auto whitespace-pre-wrap leading-relaxed border border-slate-800">
                        {viewerData.ocr_extracted_text || 'No text extracted for this document.'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* UPLOAD MODAL */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-blue-400" />
                Upload New Document
              </h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSingleUpload} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">File Document *</label>
                <input
                  type="file"
                  required
                  onChange={e => {
                    const f = e.target.files[0];
                    setUploadFile(f);
                    if (f && !uploadTitle) setUploadTitle(f.name.replace(/\.[^/.]+$/, ''));
                  }}
                  className="w-full text-slate-400 bg-slate-800 border border-slate-700 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Document Title *</label>
                <input
                  type="text"
                  required
                  value={uploadTitle}
                  onChange={e => setUploadTitle(e.target.value)}
                  placeholder="e.g. Electrical Works RFP Specification"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Document Type</label>
                  <select
                    value={uploadDocType}
                    onChange={e => setUploadDocType(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="">Select type...</option>
                    {docTypes.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Owner Category</label>
                  <select
                    value={uploadOwnerType}
                    onChange={e => setUploadOwnerType(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="TENDER">Tender</option>
                    <option value="VENDOR">Vendor</option>
                    <option value="BID">Bid</option>
                    <option value="CONTRACT">Contract</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Expiration Date (Optional)</label>
                <input
                  type="date"
                  value={uploadExpiry}
                  onChange={e => setUploadExpiry(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium shadow"
                >
                  {isUploading ? 'Uploading...' : 'Confirm Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VERIFY MODAL */}
      {isVerifyModalOpen && selectedDocForVerify && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl text-xs">
            <h3 className="font-bold text-white text-base mb-2">Verify Document</h3>
            <p className="text-slate-400 mb-4">{selectedDocForVerify.title}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Verification Status</label>
                <select
                  value={verifyStatusChoice}
                  onChange={e => setVerifyStatusChoice(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                >
                  <option value="VERIFIED">VERIFIED (Approved)</option>
                  <option value="REJECTED">REJECTED (Non-compliant)</option>
                  <option value="REVIEW_REQUIRED">REVIEW_REQUIRED (Manual Review)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Officer Notes / Reason</label>
                <textarea
                  rows="3"
                  value={verifyReason}
                  onChange={e => setVerifyReason(e.target.value)}
                  placeholder="e.g. Verified against official registry."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => setIsVerifyModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleVerifySubmit}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white font-medium shadow"
                >
                  Save Verification
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
