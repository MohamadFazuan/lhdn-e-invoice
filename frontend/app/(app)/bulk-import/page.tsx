'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  Upload, FileText, Loader2, CheckCircle2, XCircle, AlertCircle,
  RefreshCw, Send, Eye, Trash2, Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/page-header';
import { api } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import type {
  ApiResponse, BulkImport, BulkSessionResponse, BulkSubmitResponse,
} from '@/types/api';

// ── Local file state ────────────────────────────────────────────────────────

type FileStage = 'queued' | 'uploading' | 'confirming' | 'ocr' | 'done' | 'failed';

interface UploadItem {
  uid: string;
  file: File;
  stage: FileStage;
  progress: number;
  invoiceId?: string;
  error?: string;
}

// ── Status helpers ───────────────────────────────────────────────────────────

const INVOICE_STATUS_BADGE: Record<string, { label: string; className: string }> = {
  OCR_PROCESSING:      { label: 'Analysing…',   className: 'bg-blue-50 text-blue-600 border-blue-200' },
  REVIEW_REQUIRED:     { label: 'Needs Review',  className: 'bg-amber-50 text-amber-700 border-amber-200' },
  READY_FOR_SUBMISSION:{ label: 'Ready',         className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  REJECTED:            { label: 'Failed',        className: 'bg-red-50 text-red-700 border-red-200' },
};

const HISTORY_STATUS: Record<string, string> = {
  QUEUED:     'bg-zinc-100 text-zinc-600',
  PROCESSING: 'bg-blue-50 text-blue-600',
  COMPLETED:  'bg-emerald-50 text-emerald-700',
  FAILED:     'bg-red-50 text-red-700',
};

const SESSION_KEY = (biz: string) => `bulk_session_${biz}`;

// ── Component ────────────────────────────────────────────────────────────────

export default function BulkImportPage() {
  const qc = useQueryClient();
  const { business } = useAuthStore();
  const bizId = business?.id ?? '';

  // Session persisted in localStorage so the user can return after navigating away
  const [sessionId, setSessionId] = useState<string | null>(() => {
    if (typeof window === 'undefined' || !bizId) return null;
    return localStorage.getItem(SESSION_KEY(bizId));
  });

  const [items, setItems] = useState<UploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const uploadAbortRef = useRef(false);

  // Keep localStorage in sync
  useEffect(() => {
    if (!bizId) return;
    if (sessionId) localStorage.setItem(SESSION_KEY(bizId), sessionId);
    else localStorage.removeItem(SESSION_KEY(bizId));
  }, [sessionId, bizId]);

  // ── Session invoices query ────────────────────────────────────────────────

  const { data: sessionData, isLoading: sessionLoading } = useQuery({
    queryKey: ['bulk-session', sessionId],
    queryFn: async () => {
      const res = await api.get(`api/bulk-import/${sessionId}/invoices`);
      const json: ApiResponse<BulkSessionResponse> = await res.json();
      return json.data!;
    },
    enabled: !!sessionId,
    refetchInterval: (q) => {
      const hasProcessing = q.state.data?.invoices?.some(
        (i) => i.invoice.status === 'OCR_PROCESSING',
      );
      return hasProcessing ? 3000 : false;
    },
  });

  // ── Past imports list ─────────────────────────────────────────────────────

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['bulk-imports'],
    queryFn: async () => {
      const res = await api.get('api/bulk-import');
      const json: ApiResponse<BulkImport[]> = await res.json();
      return json.data ?? [];
    },
  });

  // ── Submit mutation ───────────────────────────────────────────────────────

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`api/bulk-import/${sessionId}/submit`);
      const json: ApiResponse<BulkSubmitResponse> = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? 'Submit failed');
      return json.data!;
    },
    onSuccess: (data) => {
      toast.success(`Submitted ${data.submitted} invoice${data.submitted !== 1 ? 's' : ''} to LHDN`);
      if (data.failed > 0) toast.error(`${data.failed} invoice(s) failed to submit`);
      qc.invalidateQueries({ queryKey: ['bulk-session', sessionId] });
      qc.invalidateQueries({ queryKey: ['bulk-imports'] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Submit failed'),
  });

  // ── Dropzone ──────────────────────────────────────────────────────────────

  const onDrop = useCallback((accepted: File[]) => {
    const newItems: UploadItem[] = accepted.map((f) => ({
      uid: `${Date.now()}_${Math.random()}`,
      file: f,
      stage: 'queued',
      progress: 0,
    }));
    setItems((prev) => [...prev, ...newItems]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] },
    maxSize: 10 * 1024 * 1024,
    disabled: isUploading,
  });

  const removeQueued = (uid: string) =>
    setItems((prev) => prev.filter((i) => i.uid !== uid || i.stage !== 'queued'));

  // ── Upload pipeline ───────────────────────────────────────────────────────

  const updateItem = (uid: string, patch: Partial<UploadItem>) =>
    setItems((prev) => prev.map((i) => (i.uid === uid ? { ...i, ...patch } : i)));

  const uploadFile = async (item: UploadItem, sid: string): Promise<void> => {
    const ext = item.file.name.split('.').pop()?.toLowerCase() ?? 'pdf';

    try {
      // 1. Get presigned URL
      updateItem(item.uid, { stage: 'uploading', progress: 5 });
      const urlRes = await api.post('api/files/upload-url', {
        json: { fileName: item.file.name, fileType: ext, fileSize: item.file.size },
      });
      const urlJson: ApiResponse<{ uploadUrl: string; r2Key: string }> = await urlRes.json();
      if (!urlJson.success) throw new Error(urlJson.error?.message ?? 'Could not get upload URL');
      const { uploadUrl, r2Key } = urlJson.data!;

      // 2. PUT to R2 with progress via XHR
      await new Promise<void>((resolve, reject) => {
        if (uploadAbortRef.current) return reject(new Error('Upload cancelled'));
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', item.file.type || 'application/octet-stream');
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            updateItem(item.uid, { progress: Math.round((e.loaded / e.total) * 85) + 5 });
          }
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)));
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(item.file);
      });

      // 3. Confirm upload → triggers OCR, links to session
      updateItem(item.uid, { stage: 'confirming', progress: 92 });
      const confirmRes = await api.post('api/files/confirm', {
        json: { r2Key, bulkSessionId: sid },
      });
      const confirmJson: ApiResponse<{ invoiceId: string }> = await confirmRes.json();
      if (!confirmJson.success) throw new Error(confirmJson.error?.message ?? 'Confirm failed');

      updateItem(item.uid, { stage: 'ocr', progress: 100, invoiceId: confirmJson.data!.invoiceId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      updateItem(item.uid, { stage: 'failed', error: msg });
      throw err;
    }
  };

  const handleStartUpload = async () => {
    const pending = items.filter((i) => i.stage === 'queued');
    if (pending.length === 0) return;

    setIsUploading(true);
    uploadAbortRef.current = false;

    try {
      // Create session once if none exists
      let sid = sessionId;
      if (!sid) {
        const res = await api.post('api/bulk-import/session');
        const json: ApiResponse<BulkImport> = await res.json();
        if (!json.success) throw new Error(json.error?.message ?? 'Could not create session');
        sid = json.data!.id;
        setSessionId(sid);
      }

      // Upload sequentially so the queue isn't flooded
      for (const item of pending) {
        if (uploadAbortRef.current) break;
        await uploadFile(item, sid).catch(() => {
          // individual errors are captured in item state; continue with remaining files
        });
      }

      // Refresh session data
      qc.invalidateQueries({ queryKey: ['bulk-session', sid] });
      qc.invalidateQueries({ queryKey: ['bulk-imports'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleNewSession = () => {
    setSessionId(null);
    setItems([]);
    qc.removeQueries({ queryKey: ['bulk-session'] });
  };

  // ── Derived state ─────────────────────────────────────────────────────────

  const queuedItems = items.filter((i) => i.stage === 'queued');
  const activeItems = items.filter((i) => i.stage !== 'queued');
  const stats = sessionData?.stats;
  const sessionInvoices = sessionData?.invoices ?? [];
  const hasReadyInvoices = (stats?.ready ?? 0) > 0;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="Bulk Import">
        {sessionId && (
          <Button variant="outline" size="sm" onClick={handleNewSession}>
            <Plus className="mr-2 h-4 w-4" />New Session
          </Button>
        )}
      </PageHeader>

      {/* ── Drop zone ── */}
      <div
        {...getRootProps()}
        className={`rounded-xl border-2 border-dashed transition-colors cursor-pointer
          ${isDragActive ? 'border-zinc-400 bg-zinc-50' : 'border-zinc-200 bg-white'}
          ${isUploading ? 'pointer-events-none opacity-60' : ''}
          p-8 text-center`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-8 w-8 text-zinc-300 mb-2" />
        <p className="text-sm font-medium text-zinc-700">
          {isDragActive ? 'Drop files here' : 'Drop invoice documents here, or click to browse'}
        </p>
        <p className="text-xs text-zinc-500 mt-1">PDF, JPG, PNG — up to 10 MB each — multiple files allowed</p>
      </div>

      {/* ── Queued files list ── */}
      {queuedItems.length > 0 && (
        <Card className="border-zinc-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-700">
              {queuedItems.length} file{queuedItems.length !== 1 ? 's' : ''} ready to upload
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pb-3">
            {queuedItems.map((item) => (
              <div key={item.uid} className="flex items-center gap-3 text-sm">
                <FileText className="h-4 w-4 text-zinc-400 shrink-0" />
                <span className="flex-1 text-zinc-700 truncate">{item.file.name}</span>
                <span className="text-xs text-zinc-400">{(item.file.size / 1024).toFixed(0)} KB</span>
                <button
                  onClick={() => removeQueued(item.uid)}
                  className="text-zinc-400 hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <Button
              onClick={handleStartUpload}
              className="w-full mt-3 bg-zinc-900 hover:bg-zinc-700 text-white"
              disabled={isUploading}
            >
              {isUploading
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading…</>
                : <><Upload className="mr-2 h-4 w-4" />Upload & Analyse ({queuedItems.length})</>
              }
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── In-progress upload status ── */}
      {activeItems.length > 0 && (
        <Card className="border-zinc-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-700">Upload Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pb-3">
            {activeItems.map((item) => (
              <div key={item.uid} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-600 truncate max-w-[280px]">{item.file.name}</span>
                  {item.stage === 'done' || item.stage === 'ocr'
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    : item.stage === 'failed'
                    ? <XCircle className="h-3.5 w-3.5 text-red-500" />
                    : <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />
                  }
                </div>
                <Progress value={item.progress} className="h-1" />
                {item.stage === 'failed' && (
                  <p className="text-xs text-red-600">{item.error}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Session OCR results table ── */}
      {sessionId && (
        <Card className="border-zinc-200 shadow-sm overflow-hidden">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium">
              OCR Results
              {stats && (
                <span className="ml-2 text-sm font-normal text-zinc-500">
                  {stats.total} file{stats.total !== 1 ? 's' : ''}
                  {stats.processing > 0 && ` · ${stats.processing} analysing`}
                  {stats.ready > 0 && ` · ${stats.ready} ready`}
                  {stats.reviewing > 0 && ` · ${stats.reviewing} need review`}
                </span>
              )}
            </CardTitle>
            {hasReadyInvoices && (
              <Button
                size="sm"
                className="bg-zinc-900 hover:bg-zinc-700 text-white"
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <Send className="mr-2 h-4 w-4" />
                }
                Submit All Ready ({stats?.ready})
              </Button>
            )}
          </CardHeader>

          <CardContent className="p-0">
            {sessionLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
              </div>
            ) : sessionInvoices.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-10">
                Upload files above to start OCR analysis
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/50">
                    <th className="text-left px-4 py-2.5 font-medium text-zinc-500">Document</th>
                    <th className="text-left px-4 py-2.5 font-medium text-zinc-500">Buyer</th>
                    <th className="text-right px-4 py-2.5 font-medium text-zinc-500">Amount</th>
                    <th className="text-left px-4 py-2.5 font-medium text-zinc-500">Confidence</th>
                    <th className="text-left px-4 py-2.5 font-medium text-zinc-500">Status</th>
                    <th className="text-right px-4 py-2.5 font-medium text-zinc-500"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {sessionInvoices.map(({ invoice, ocrDocument }) => {
                    const badge = INVOICE_STATUS_BADGE[invoice.status] ?? {
                      label: invoice.status, className: 'bg-zinc-100 text-zinc-600',
                    };
                    const confidence = ocrDocument?.confidenceScore
                      ? Math.round(parseFloat(ocrDocument.confidenceScore) * 100)
                      : null;
                    const isProcessing = invoice.status === 'OCR_PROCESSING';

                    return (
                      <tr key={invoice.id} className="hover:bg-zinc-50/50">
                        <td className="px-4 py-3">
                          <p className="text-zinc-700 truncate max-w-[180px]">
                            {ocrDocument?.originalFilename ?? invoice.id}
                          </p>
                          <p className="text-xs text-zinc-400">{invoice.invoiceNumber ?? '—'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-zinc-700 truncate max-w-[160px]">
                            {invoice.buyerName ?? (isProcessing ? '…' : '—')}
                          </p>
                          <p className="text-xs text-zinc-400">{invoice.issueDate ?? ''}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="font-medium text-zinc-900">
                            {invoice.grandTotal && invoice.grandTotal !== '0.00'
                              ? formatCurrency(invoice.grandTotal)
                              : isProcessing ? '…' : '—'}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          {confidence !== null ? (
                            <div className="flex items-center gap-1.5">
                              <div className="w-16 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${confidence >= 80 ? 'bg-emerald-500' : confidence >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}
                                  style={{ width: `${confidence}%` }}
                                />
                              </div>
                              <span className="text-xs text-zinc-500">{confidence}%</span>
                            </div>
                          ) : isProcessing ? (
                            <Loader2 className="h-3.5 w-3.5 text-blue-400 animate-spin" />
                          ) : (
                            <span className="text-xs text-zinc-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={`text-xs ${badge.className}`}>
                            {badge.label}
                          </Badge>
                          {invoice.status === 'REVIEW_REQUIRED' && ocrDocument?.processingError && (
                            <p className="text-xs text-amber-600 mt-0.5 max-w-[140px] truncate">
                              {ocrDocument.processingError}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!isProcessing && (
                            <Link href={`/invoices/${invoice.id}`}>
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-zinc-500 hover:text-zinc-900">
                                <Eye className="mr-1 h-3 w-3" />View
                              </Button>
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Submit results feedback ── */}
      {submitMutation.data && (
        <Card className="border-zinc-200 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              {submitMutation.data.failed === 0
                ? <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                : <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
              }
              <div>
                <p className="text-sm font-medium text-zinc-900">
                  {submitMutation.data.submitted} submitted · {submitMutation.data.failed} failed
                </p>
                {submitMutation.data.results.filter((r) => !r.success).map((r) => (
                  <p key={r.invoiceId} className="text-xs text-red-600">{r.invoiceId}: {r.error}</p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── History ── */}
      <Card className="border-zinc-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium">Import History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {historyLoading ? (
            <Skeleton className="h-24 m-4" />
          ) : !history?.length ? (
            <p className="text-sm text-zinc-400 text-center py-8">No imports yet</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50">
                  <th className="text-left px-4 py-2 font-medium text-zinc-500">Session / File</th>
                  <th className="text-left px-4 py-2 font-medium text-zinc-500">Type</th>
                  <th className="text-left px-4 py-2 font-medium text-zinc-500">Date</th>
                  <th className="text-left px-4 py-2 font-medium text-zinc-500">Status</th>
                  <th className="text-right px-4 py-2 font-medium text-zinc-500">Files</th>
                  <th className="text-right px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {history.map((imp) => (
                  <tr key={imp.id} className="hover:bg-zinc-50/50">
                    <td className="px-4 py-2.5 text-zinc-700 max-w-[200px] truncate">
                      {imp.source === 'DOCUMENTS' ? 'Document Session' : imp.originalFilename}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant="outline" className="text-xs border-zinc-200 text-zinc-500">
                        {imp.source === 'DOCUMENTS' ? 'OCR Docs' : 'CSV'}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-zinc-500">{formatDate(imp.createdAt)}</td>
                    <td className="px-4 py-2.5">
                      <Badge className={`${HISTORY_STATUS[imp.status]} border-0 text-xs`}>
                        {imp.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-zinc-500">
                      {imp.totalRows ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {imp.source === 'DOCUMENTS' && imp.id !== sessionId && (
                        <button
                          className="text-xs text-zinc-400 hover:text-zinc-700 flex items-center gap-1 ml-auto"
                          onClick={() => setSessionId(imp.id)}
                        >
                          <RefreshCw className="h-3 w-3" />Resume
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
