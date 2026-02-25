'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Upload, File, X, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { ApiResponse, PresignedUrl, Invoice } from '@/types/api';

const ACCEPTED = { 'application/pdf': ['.pdf'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] };
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

type Stage = 'idle' | 'uploading' | 'processing' | 'done';

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<Stage>('idle');
  const [progress, setProgress] = useState(0);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) setFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxSize: MAX_SIZE,
    maxFiles: 1,
    onDropRejected: () => toast.error('File rejected. Max 10MB, PDF/JPG/PNG only.'),
  });

  const handleUpload = async () => {
    if (!file) return;
    setStage('uploading');
    setProgress(0);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'pdf';

      // 1. Get presigned URL
      const urlRes = await api.post('api/files/upload-url', { json: { fileType: ext, fileName: file.name } });
      const urlJson: ApiResponse<PresignedUrl> = await urlRes.json();
      if (!urlJson.success) throw new Error(urlJson.error?.message);
      const { url, r2Key } = urlJson.data!;

      // 2. Upload to R2 with progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('Upload failed')));
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.open('PUT', url);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });

      setProgress(100);

      // 3. Confirm upload → trigger OCR → get invoice ID
      const confirmRes = await api.post('api/files/confirm', { json: { r2Key } });
      const confirmJson: ApiResponse<{ invoiceId: string }> = await confirmRes.json();
      if (!confirmJson.success) throw new Error(confirmJson.error?.message);

      setInvoiceId(confirmJson.data!.invoiceId);
      setStage('processing');

      // 4. Poll invoice status
      const poll = setInterval(async () => {
        try {
          const invRes = await api.get(`api/invoices/${confirmJson.data!.invoiceId}`);
          const invJson: ApiResponse<Invoice> = await invRes.json();
          if (invJson.data?.status !== 'OCR_PROCESSING') {
            clearInterval(poll);
            setStage('done');
          }
        } catch {
          clearInterval(poll);
        }
      }, 3000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
      setStage('idle');
    }
  };

  return (
    <div className="max-w-lg space-y-6">
      <PageHeader title="Upload Document" description="Upload a PDF or image invoice for AI extraction." />

      {stage === 'idle' && (
        <>
          <div
            {...getRootProps()}
            className={cn(
              'rounded-xl border-2 border-dashed border-zinc-200 bg-white p-12 text-center cursor-pointer transition-colors',
              isDragActive && 'border-zinc-400 bg-zinc-50',
              file && 'border-zinc-300',
            )}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-10 w-10 text-zinc-300 mb-3" />
            {isDragActive ? (
              <p className="text-sm text-zinc-600">Drop it here…</p>
            ) : (
              <>
                <p className="text-sm font-medium text-zinc-700">Drag & drop your file here</p>
                <p className="text-xs text-zinc-500 mt-1">or click to browse — PDF, JPG, PNG up to 10MB</p>
              </>
            )}
          </div>

          {file && (
            <Card className="border-zinc-200 shadow-sm">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100">
                  <File className="h-4 w-4 text-zinc-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">{file.name}</p>
                  <p className="text-xs text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400" onClick={() => setFile(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          )}

          <Button
            onClick={handleUpload}
            disabled={!file}
            className="w-full bg-zinc-900 hover:bg-zinc-700 text-white"
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload & Extract
          </Button>
        </>
      )}

      {stage === 'uploading' && (
        <Card className="border-zinc-200 shadow-sm">
          <CardContent className="p-6 space-y-4 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-zinc-400" />
            <p className="text-sm font-medium text-zinc-700">Uploading…</p>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-zinc-500">{progress}%</p>
          </CardContent>
        </Card>
      )}

      {stage === 'processing' && (
        <Card className="border-zinc-200 shadow-sm">
          <CardContent className="p-6 space-y-3 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-500" />
            <p className="text-sm font-medium text-zinc-700">AI is extracting invoice data…</p>
            <p className="text-xs text-zinc-500">This usually takes 10–30 seconds.</p>
          </CardContent>
        </Card>
      )}

      {stage === 'done' && invoiceId && (
        <Card className="border-zinc-200 shadow-sm">
          <CardContent className="p-6 space-y-3 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
            <p className="text-sm font-medium text-zinc-700">Extraction complete!</p>
            <Button onClick={() => router.push(`/invoices/${invoiceId}`)} className="bg-zinc-900 hover:bg-zinc-700 text-white">
              Review Invoice
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
