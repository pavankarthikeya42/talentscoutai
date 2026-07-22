import { useState, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Upload, FileText, CheckCircle, XCircle, Loader2, Users, Briefcase } from 'lucide-react'
import { resumesApi, type BulkUploadResult } from '@/api/resumes'
import { jobsApi } from '@/api/jobs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import axios from 'axios'

function getUploadError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.detail ?? err.message ?? 'Upload failed'
  }
  return err instanceof Error ? err.message : 'Upload failed'
}

export function ResumeUploadPage() {
  const { user } = useAuth()
  const isHR = user?.role?.toLowerCase() === 'hr'
  const qc = useQueryClient()

  const [files, setFiles] = useState<File[]>([])
  const [jobId, setJobId] = useState<string>('none')
  const [uploading, setUploading] = useState(false)
  const [results, setResults] = useState<BulkUploadResult[] | null>(null)
  const [dragging, setDragging] = useState(false)

  const { data: jobsData } = useQuery({
    queryKey: ['jobs', { page_size: 50, status: 'open' }],
    queryFn: () => jobsApi.list({ page_size: 50, status: 'open' }).then((r) => r.data),
    enabled: isHR,
  })

  if (!isHR) {
    return <Navigate to="/dashboard" replace />
  }

  const addFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter(
      (f) =>
        f.type === 'application/pdf' ||
        f.name.toLowerCase().endsWith('.pdf') ||
        f.name.toLowerCase().endsWith('.docx') ||
        f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
    if (validFiles.length !== newFiles.length) toast.warning('Only PDF and DOCX files are accepted')
    const oversized = validFiles.filter((f) => f.size > 10 * 1024 * 1024)
    if (oversized.length > 0) toast.warning(`${oversized.length} file(s) exceed 10MB limit`)
    const valid = validFiles.filter((f) => f.size <= 10 * 1024 * 1024)
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name))
      return [...prev, ...valid.filter((f) => !existing.has(f.name))].slice(0, 20)
    })
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    addFiles(Array.from(e.dataTransfer.files))
  }, [])

  const handleUpload = async () => {
    if (files.length === 0) return
    setUploading(true)
    setResults(null)
    try {
      const selectedJobId = jobId === 'none' ? undefined : jobId
      if (files.length === 1) {
        const res = await resumesApi.upload(files[0], selectedJobId)
        setResults([{ filename: files[0].name, status: 'success', candidate_id: res.data.candidate_id }])
        toast.success('Resume uploaded and parsed successfully')
      } else {
        const res = await resumesApi.uploadBulk(files, selectedJobId)
        setResults(res.data.results)
        toast.success(`${res.data.successful}/${res.data.total} resumes uploaded`)
      }
      setFiles([])
      qc.invalidateQueries({ queryKey: ['candidates'] })
      qc.invalidateQueries({ queryKey: ['applications'] })
    } catch (err) {
      toast.error(getUploadError(err))
    } finally {
      setUploading(false)
    }
  }

  const successCount = results?.filter((r) => r.status === 'success').length ?? 0

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] page-enter pb-10">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Upload Resumes</h1>
          <p className="text-sm text-slate-500 mt-1.5">HR-only — AI parses PDFs and adds candidates to the talent pool</p>
        </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Open Jobs', value: jobsData?.jobs.length ?? 0, sub: 'link uploads to a role', Icon: Briefcase, bg: 'bg-blue-50', color: 'text-blue-600' },
          { label: 'Files Ready', value: files.length, sub: 'max 20 per batch', Icon: Users, bg: 'bg-violet-50', color: 'text-violet-600' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{s.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{s.sub}</p>
                </div>
                <div className={`p-2 rounded-lg ${s.bg}`}>
                  <s.Icon className={`h-4 w-4 ${s.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-white/90 backdrop-blur-sm border border-slate-100/80 shadow-sm rounded-xl">
        <CardHeader className="pb-3 border-b border-slate-50/50">
          <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Upload className="h-4 w-4 text-indigo-500" />
            Upload Files
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <div
            onDrop={onDrop}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onClick={() => document.getElementById('file-input')?.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
              dragging ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
            }`}
          >
            <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
            <p className="font-medium text-gray-700">Drop PDF files here or click to browse</p>
            <p className="text-sm text-gray-500 mt-1">PDF · Max 10MB per file · Max 20 files</p>
            <input id="file-input" type="file" accept=".pdf,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" multiple className="hidden" onChange={(e) => addFiles(Array.from(e.target.files ?? []))} />
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">{files.length} file(s) selected</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                      <span className="text-sm text-gray-700 truncate">{f.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-400">{(f.size / 1024).toFixed(0)}KB</span>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setFiles((prev) => prev.filter((_, j) => j !== i)) }} className="text-gray-400 hover:text-red-500">×</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Link to Job (optional)</Label>
            <Select value={jobId} onValueChange={setJobId}>
              <SelectTrigger><SelectValue placeholder="Select a job" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No specific job</SelectItem>
                {jobsData?.jobs.map((j) => (
                  <SelectItem key={j.id} value={j.id}>{j.title} ({j.vacancies ?? 1} vacancies)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleUpload}
            disabled={uploading || files.length === 0}
            className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700"
          >
            {uploading ? <><Loader2 className="h-4 w-4 animate-spin" />Uploading & Parsing…</> : `Upload ${files.length > 0 ? files.length : ''} Resume${files.length !== 1 ? 's' : ''}`}
          </Button>
        </CardContent>
      </Card>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold">Upload Results — {successCount}/{results.length} succeeded</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {results.map((r, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-gray-100 p-3">
                {r.status === 'success'
                  ? <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                  : <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">{r.filename}</p>
                  {r.status === 'error' && <p className="text-xs text-red-500">{r.error}</p>}
                </div>
                {r.status === 'success' && <Badge variant="success">Parsed</Badge>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  )
}
