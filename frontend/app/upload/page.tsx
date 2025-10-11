 'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type InitResponse = { key: string; uploadUrl: string };

function UploadPageInner() {
  const params = useSearchParams();
  const projectId = useMemo(() => params.get('project') || '', [params]);

  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number>(0);

  const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, '') || 'http://localhost:3001';

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setStatus(null);
    setProgress(0);
    setFile(e.target.files?.[0] ?? null);
  };

  const startUpload = async () => {
    setError(null);
    setStatus(null);

    if (!projectId) {
      setError('Missing project id. Open this from the Projects page.');
      return;
    }
    if (!file) {
      setError('Choose a file first.');
      return;
    }

    const allowed = [
      'text/csv',
      'application/json',
      'application/x-ndjson',
      'application/pdf',
      'text/plain',
    ];
    if (!allowed.includes(file.type)) {
      setError(`File type not allowed: ${file.type || 'unknown'}`);
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setError('File too large (max 100 MB).');
      return;
    }

    try {
      setUploading(true);

      const initRes = await fetch(
        `${API_BASE}/v1/datasets/${encodeURIComponent(projectId)}/upload-init`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
          }),
        }
      );

      if (!initRes.ok) {
        const t = await initRes.text();
        throw new Error(`upload-init failed (${initRes.status}): ${t}`);
      }

      const { key, uploadUrl } = (await initRes.json()) as InitResponse;

      await putWithProgress(uploadUrl, file, file.type, (pct) => setProgress(pct));

      setStatus(`✅ Upload complete! S3 key: ${key}`);
    } catch (e: any) {
      setError(e?.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const putWithProgress = (
    url: string,
    blob: Blob,
    contentType: string,
    onProgress: (pct: number) => void
  ) => {
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', url);
      xhr.setRequestHeader('Content-Type', contentType);
      xhr.setRequestHeader('x-amz-server-side-encryption', 'AES256');
      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable) {
          const pct = Math.round((evt.loaded / evt.total) * 100);
          onProgress(pct);
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress(100);
          resolve();
        } else {
          reject(new Error(`S3 PUT failed: ${xhr.status} ${xhr.statusText}`));
        }
      };
      xhr.onerror = () => reject(new Error('Network error during S3 upload.'));
      xhr.send(blob);
    });
  };

  return (
    <main className="min-h-screen max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-2">Upload dataset</h1>
      {!projectId ? (
        <div className="rounded-xl border bg-white p-4 shadow">
          <p className="text-sm text-red-600 mb-2">No project selected.</p>
          <a href="/orgs" className="text-sm underline">
            Go back to Organizations →
          </a>
        </div>
      ) : (
        <div className="rounded-xl border bg-white p-4 shadow">
          <p className="text-sm text-gray-700 mb-3">
            Project: <span className="font-mono">{projectId}</span>
          </p>
          <input type="file" onChange={onFileChange} className="mb-3" />
          <button
            onClick={startUpload}
            disabled={uploading || !file}
            className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {uploading ? 'Uploading…' : 'Start upload'}
          </button>
          {uploading && (
            <div className="mt-3">
              <div className="w-full h-2 bg-gray-200 rounded">
                <div
                  className="h-2 bg-gray-900 rounded"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-600 mt-1">{progress}%</p>
            </div>
          )}
          {status && <p className="mt-3 text-sm text-green-700">{status}</p>}
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>
      )}
      <div className="pt-6">
        <a href="/projects" className="text-xs text-gray-500 hover:underline">
          ← Back to Projects
        </a>
      </div>
    </main>
  );
}

export default function UploadPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-600">Loading upload page…</div>}>
      <UploadPageInner />
    </Suspense>
  );
}
