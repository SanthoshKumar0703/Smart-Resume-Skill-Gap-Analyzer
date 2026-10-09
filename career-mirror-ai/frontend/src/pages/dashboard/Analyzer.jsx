import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Check,
  CheckCircle2,
  CloudUpload,
  FileText,
  Loader2,
  Pencil,
  Plus,
  ScanSearch,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { api, errMsg } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { useNotifications } from '../../context/NotificationContext'
import { Badge, Button, Modal, PageHead, Skeleton, SkillChips } from '../../components/ui'
import { cx, fileSizeLabel, toSkillNames } from '../../utils/helpers'

const STEP_LABELS = ['Upload resume', 'Add job description', 'Run analysis']

export default function Analyzer() {
  const toast = useToast()
  const navigate = useNavigate()
  const { refresh } = useNotifications()

  const [step, setStep] = useState(0)
  const [resume, setResume] = useState(null)
  const [jd, setJd] = useState(null)

  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [parsing, setParsing] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const [jdMode, setJdMode] = useState('paste')
  const [jdText, setJdText] = useState('')
  const [jdTitle, setJdTitle] = useState('')
  const [jdSaving, setJdSaving] = useState(false)
  const [jdError, setJdError] = useState('')

  const [analyzing, setAnalyzing] = useState(false)
  const [editingSkill, setEditingSkill] = useState(null)

  const fileRef = useRef(null)

  /* ---------- resume upload ---------- */
  const uploadFile = useCallback(async (file) => {
    if (!file) return
    const okType = /\.(pdf|docx)$/i.test(file.name)
    if (!okType) {
      setUploadError('Resume must be a PDF or DOCX file.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Resume must be smaller than 10 MB.')
      return
    }
    if (file.size === 0) {
      setUploadError('The uploaded file is empty.')
      return
    }
    setUploadError('')
    setUploading(true)
    setParsing(true)
    setUploadProgress(0)
    const timer = setInterval(() => setUploadProgress((p) => Math.min(92, p + 8)), 180)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await api.post('/resumes/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      clearInterval(timer)
      setUploadProgress(100)
      setResume(res.data)
      toast.success('Resume processed', `Found ${res.data.extracted?.skills?.length ?? 0} skills · ${res.data.extracted?.name || 'profile'} extracted — review it below`)
    } catch (err) {
      clearInterval(timer)
      setUploadError(errMsg(err, 'Resume could not be uploaded.'))
    } finally {
      setUploading(false)
      setTimeout(() => setParsing(false), 400)
    }
  }, [toast])

  /* ---------- JD ---------- */
  const saveJd = async () => {
    setJdError('')
    if (jdMode === 'paste') {
      if (!jdText.trim()) {
        setJdError('Job description is empty. Paste the JD text first.')
        return
      }
    } else {
      if (!jdFile) {
        setJdError('Select a job description file first.')
        return
      }
    }
    setJdSaving(true)
    try {
      if (jdMode === 'paste') {
        const res = await api.post('/jobs', {
          title: jdTitle.trim() || 'Untitled Role',
          description: jdText,
        })
        setJd(res.data)
      } else {
        const form = new FormData()
        form.append('file', jdFile)
        form.append('title', jdTitle.trim() || 'Untitled Role')
        const res = await api.post('/jobs/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
        setJd(res.data)
      }
      toast.success('Job description parsed', 'Review the extracted requirements below, then continue.')
    } catch (err) {
      setJdError(errMsg(err, 'Job description could not be processed.'))
    } finally {
      setJdSaving(false)
    }
  }

  const [jdFile, setJdFile] = useState(null)

  /* ---------- run analysis ---------- */
  const runAnalysis = async () => {
    setAnalyzing(true)
    try {
      const res = await api.post('/analysis', { resume_id: resume.id, job_id: jd.id })
      refresh()
      toast.success(
        'Analysis completed 🎯',
        `${res.data.job_title || jd.title}: ${Math.round(res.data.overall_score)}% match · ${res.data.missing_skills?.length ?? 0} skills to close.`
      )
      navigate(`/app/history/${res.data.id}`, { state: { fresh: true } })
    } catch (err) {
      toast.error('Analysis failed', errMsg(err))
    } finally {
      setAnalyzing(false)
    }
  }

  /* ---------- edit extraction ---------- */
  const removeSkill = async (name) => {
    const skills = resume.extracted.skills.filter((s) => s.name !== name)
    const updated = { ...resume, extracted: { ...resume.extracted, skills } }
    setResume(updated)
    try {
      await api.put(`/resumes/${resume.id}/extracted`, { skills })
    } catch (err) {
      toast.error('Could not save changes', errMsg(err))
    }
  }

  const addSkill = async (name) => {
    if (!name.trim()) return
    if (resume.extracted.skills.some((s) => s.name.toLowerCase() === name.trim().toLowerCase())) {
      setEditingSkill(null)
      return
    }
    const skills = [...resume.extracted.skills, { name: name.trim(), category: 'Other', importance: 'medium' }]
    setResume({ ...resume, extracted: { ...resume.extracted, skills } })
    try {
      await api.put(`/resumes/${resume.id}/extracted`, { skills })
    } catch (err) {
      toast.error('Could not save changes', errMsg(err))
    }
    setEditingSkill(null)
  }

  const saveProfileField = async (field, value) => {
    const extracted = { ...resume.extracted, [field]: value }
    setResume({ ...resume, extracted })
    try {
      await api.put(`/resumes/${resume.id}/extracted`, { [field]: value })
      toast.success('Profile updated', `${field.replace('_', ' ')} saved.`)
    } catch (err) {
      toast.error('Could not save changes', errMsg(err))
    }
  }

  const parsed = jd?.parsed || {}

  return (
    <div className="page-enter">
      <PageHead
        title="Resume Analyzer"
        sub="Upload your resume, add a target role, and get your full skill-gap intelligence."
      />

      {/* Stepper */}
      <div className="flex mb-24" style={{ gap: 8, flexWrap: 'wrap' }}>
        {STEP_LABELS.map((label, i) => (
          <div key={label} className={cx('analyzer-step', i < step && 'done')} style={{ marginBottom: 0, flex: 1, minWidth: 190, cursor: i < step ? 'pointer' : 'default' }} onClick={() => i < step && setStep(i)}>
            <span className="as-num">{i < step ? <Check size={14} /> : i + 1}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{label}</div>
              {i < step && <div className="small" style={{ color: 'var(--success)' }}>Complete</div>}
            </div>
          </div>
        ))}
      </div>

      {/* ============ STEP 0: RESUME ============ */}
      {step === 0 && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <div className="grid-2">
            <div className="card card-pad">
              <div className="card-title mb-16"><CloudUpload size={16} /> Upload your resume</div>
              <div
                className={cx('dropzone', dragging && 'dragging')}
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); uploadFile(e.dataTransfer.files[0]) }}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => uploadFile(e.target.files[0])}
                  aria-label="Upload resume file"
                />
                <div className="dz-icon"><Upload size={26} /></div>
                <h3 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 16 }}>
                  Drag &amp; drop your resume here
                </h3>
                <p className="small muted mt-8">or click to browse · PDF or DOCX · up to 10 MB</p>
                <div className="mt-16 flex" style={{ justifyContent: 'center', gap: 10 }}>
                  <span className="badge badge-neutral">PDF</span>
                  <span className="badge badge-neutral">DOCX</span>
                  <span className="badge badge-accent">parsed locally</span>
                </div>
              </div>
              {uploading && (
                <div className="upload-progress">
                  <div className="flex-between small mb-8">
                    <span className="muted">{parsing ? 'Parsing & extracting…' : 'Uploading…'}</span>
                    <b>{uploadProgress}%</b>
                  </div>
                  <div className="progress"><div className="progress-fill" style={{ width: `${uploadProgress}%` }} /></div>
                </div>
              )}
              {uploadError && <p className="field-error mt-16">{uploadError}</p>}
              <div className="small muted mt-16" style={{ lineHeight: 1.7 }}>
                <b style={{ color: 'var(--ink-2)' }}>Privacy first:</b> your file is parsed on this server and never
                sent to third-party AI services.
              </div>
            </div>

            {/* Extraction preview */}
            <div className="card card-pad">
              <div className="card-title mb-16"><ScanSearch size={16} /> Extracted profile</div>
              {!resume ? (
                <div className="empty-state" style={{ padding: '30px 10px' }}>
                  <p>Your resume's information will appear here — review and correct it before analyzing.</p>
                </div>
              ) : (
                <div>
                  <div className="file-pill mb-16">
                    <span className={cx('fp-icon', (resume.filename || '').toLowerCase().endsWith('.pdf') ? 'pdf' : 'docx')}>
                      <FileText size={16} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{resume.filename}</div>
                      <div className="small muted">{fileSizeLabel(resume.size)}</div>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => { fileRef.current?.click() }} title="Replace file"><Upload size={14} /> Replace</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setResume(null); setStep(0) }} title="Remove"><X size={14} /></button>
                  </div>

                  <EditableRow label="Name" value={resume.extracted.name} onSave={(v) => saveProfileField('name', v)} icon={<Pencil size={13} />} />
                  <EditableRow label="Email" value={resume.extracted.contact?.email} onSave={(v) => saveProfileField('contact', { ...resume.extracted.contact, email: v })} />
                  <EditableRow label="Years of experience" value={`${resume.extracted.years_of_experience ?? 0} yrs`} onSave={(v) => saveProfileField('years_of_experience', parseFloat(v) || 0)} />
                  <div className="kv-row"><span className="k">Education</span><span className="v">{resume.extracted.education?.level || '—'}</span></div>
                  <div className="kv-row"><span className="k">Certifications</span><span className="v">{(resume.extracted.certifications || []).length}</span></div>
                  <div className="kv-row"><span className="k">Projects</span><span className="v">{(resume.extracted.projects || []).length}</span></div>

                  <div className="flex-between mt-16 mb-8">
                    <b className="small">Skills ({resume.extracted.skills?.length ?? 0})</b>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditingSkill('__new__')}><Plus size={14} /> Add</button>
                  </div>
                  <SkillChips
                    skills={toSkillNames(resume.extracted.skills || [])}
                    onSelect={(name) => {
                      if (window.confirm(`Remove "${name}" from your skills?`)) removeSkill(name)
                    }}
                    limit={80}
                  />
                  <p className="small muted mt-8">Click a skill to remove it. Edits are saved to your profile instantly.</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex-between mt-24">
            <div />
            <Button className="btn btn-royal btn-lg" disabled={!resume} onClick={() => setStep(1)}>
              Continue <ArrowRight size={17} />
            </Button>
          </div>
        </motion.div>
      )}

      {/* ============ STEP 1: JD ============ */}
      {step === 1 && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <div className="grid-2">
            <div className="card card-pad">
              <div className="card-title mb-16"><Briefcase size={16} /> Target job description</div>
              <div className="tabs mb-16" style={{ border: 'none', gap: 8 }}>
                <button className={cx('tab', jdMode === 'paste' && 'active')} style={{ border: '1px solid var(--line)', borderRadius: 10, borderBottom: '1px solid var(--line)' }} onClick={() => setJdMode('paste')}>
                  Paste text
                </button>
                <button className={cx('tab', jdMode === 'file' && 'active')} style={{ border: '1px solid var(--line)', borderRadius: 10, borderBottom: '1px solid var(--line)' }} onClick={() => setJdMode('file')}>
                  <Upload size={14} /> Upload file
                </button>
              </div>

              <div className="field">
                <label htmlFor="jd-title">Job title <span className="muted">(optional)</span></label>
                <input id="jd-title" className="input" placeholder="e.g. Senior Full Stack Developer" value={jdTitle} onChange={(e) => setJdTitle(e.target.value)} />
              </div>

              {jdMode === 'paste' ? (
                <div className="field">
                  <label htmlFor="jd-text">Job description text</label>
                  <textarea
                    id="jd-text"
                    className="input"
                    placeholder="Paste the full job posting here — responsibilities, requirements, nice-to-haves…"
                    value={jdText}
                    onChange={(e) => setJdText(e.target.value)}
                    style={{ minHeight: 260 }}
                  />
                </div>
              ) : (
                <div
                  className={cx('dropzone', dragging && 'dragging')}
                  style={{ padding: 30 }}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setDragging(false); setJdFile(e.dataTransfer.files[0]) }}
                >
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={(e) => setJdFile(e.target.files[0])}
                    aria-label="Upload job description file"
                  />
                  <div className="dz-icon" style={{ width: 44, height: 44, marginBottom: 10 }}><Upload size={20} /></div>
                  <b style={{ fontSize: 14 }}>{jdFile ? jdFile.name : 'Drop a job description file'}</b>
                  <p className="small muted mt-8">PDF · DOCX · TXT</p>
                </div>
              )}

              {jdError && <p className="field-error mb-16">{jdError}</p>}

              <div className="flex" style={{ justifyContent: 'flex-end', gap: 10 }}>
                <button className="btn btn-ghost" onClick={() => setStep(0)}><ArrowLeft size={15} /> Back</button>
                {jd ? (
                  <Button className="btn btn-royal" onClick={() => setStep(2)}>
                    Continue to analysis <ArrowRight size={15} />
                  </Button>
                ) : (
                  <Button className="btn btn-royal" loading={jdSaving} onClick={saveJd}>
                    {!jdSaving && <Sparkles size={15} />} Parse requirements <ArrowRight size={15} />
                  </Button>
                )}
              </div>
            </div>

            {/* JD parse preview */}
            <div className="card card-pad">
              <div className="card-title mb-16"><ScanSearch size={16} /> Parsed requirements</div>
              {!jd ? (
                <div className="empty-state" style={{ padding: '30px 10px' }}>
                  <p>The extracted requirements — required skills, preferred skills, experience and education — will appear here.</p>
                </div>
              ) : (
                <div>
                  <div className="file-pill mb-16">
                    <span className="fp-icon docx"><Briefcase size={16} /></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{jd.title}</div>
                      <div className="small muted">parsed {new Date(jd.created_at).toLocaleDateString()}</div>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => setJd(null)}><X size={14} /></button>
                  </div>
                  <div className="kv-row"><span className="k">Experience</span><span className="v">{parsed.experience_phrase || 'Not specified'}</span></div>
                  <div className="kv-row"><span className="k">Education</span><span className="v">{parsed.education_required}</span></div>
                  <div className="kv-row"><span className="k">Certifications</span><span className="v">{(parsed.certifications_required || []).length ? parsed.certifications_required.join(', ') : 'None listed'}</span></div>
                  <div className="mt-16 mb-8"><b className="small">Required skills ({parsed.required_skills?.length ?? 0})</b></div>
                  <SkillChips skills={parsed.required_skills || []} kind="matched" limit={40} />
                  <div className="mt-16 mb-8"><b className="small">Preferred skills ({parsed.preferred_skills?.length ?? 0})</b></div>
                  <SkillChips skills={parsed.preferred_skills || []} kind="partial" limit={40} />
                  <div className="mt-16 mb-8"><b className="small">Responsibilities ({parsed.responsibilities?.length ?? 0})</b></div>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {(parsed.responsibilities || []).slice(0, 8).map((r, i) => (
                      <li key={i} className="small" style={{ color: 'var(--ink-2)', display: 'flex', gap: 8 }}>
                        <span style={{ color: 'var(--accent)' }}>•</span>{r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* ============ STEP 2: ANALYZE ============ */}
      {step === 2 && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <div className="card" style={{ borderStyle: 'dashed' }}>
            <div className="card-pad" style={{ textAlign: 'center', padding: '52px 30px' }}>
              <div className="dz-icon" style={{ margin: '0 auto 18px' }}><Sparkles size={26} /></div>
              <h2 className="display-md" style={{ marginBottom: 10 }}>Ready to run your analysis</h2>
              <p className="lead" style={{ maxWidth: 460, margin: '0 auto 26px' }}>
                Compare <b>{resume?.extracted?.name || 'your resume'}</b> against{' '}
                <b>{jd?.title}</b>. This runs the semantic matching engine locally —
                usually takes a few seconds.
              </p>
              <div className="flex" style={{ justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span className="badge badge-accent">{(resume?.extracted?.skills || []).length} candidate skills</span>
                <span className="badge badge-violet">{(jd?.parsed?.required_skills || []).length} required skills</span>
                <span className="badge badge-gold">{(jd?.parsed?.preferred_skills || []).length} preferred</span>
              </div>
              <div className="flex mt-24" style={{ justifyContent: 'center', gap: 12 }}>
                <button className="btn btn-outline btn-lg" onClick={() => setStep(1)}><ArrowLeft size={16} /> Back</button>
                <Button className="btn btn-royal btn-lg" loading={analyzing} onClick={runAnalysis}>
                  {!analyzing && <Sparkles size={17} />} {analyzing ? 'Analyzing — matching skills…' : 'Run analysis'}
                </Button>
              </div>
              {analyzing && (
                <div className="upload-progress mt-24" style={{ maxWidth: 380, margin: '0 auto' }}>
                  <div className="small muted mb-8" style={{ textAlign: 'center' }}>Extracting · normalizing · semantic matching · scoring</div>
                  <div className="progress"><div className="progress-fill violet" style={{ width: '70%', animation: 'spin 2s linear infinite', transformOrigin: 'left center' }} /></div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Add-skill modal */}
      <Modal open={editingSkill !== null} onClose={() => setEditingSkill(null)} title="Add a skill to your profile">
        <div className="field">
          <label htmlFor="new-skill">Skill name</label>
          <input
            id="new-skill"
            className="input"
            placeholder="e.g. Docker"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') addSkill(e.target.value) }}
          />
        </div>
        <div className="flex" style={{ justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => setEditingSkill(null)}>Cancel</button>
          <button className="btn btn-royal" onClick={(e) => addSkill(document.getElementById('new-skill')?.value)}>
            <CheckCircle2 size={15} /> Add skill
          </button>
        </div>
      </Modal>
    </div>
  )
}

function EditableRow({ label, value, onSave, icon }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value ?? '')

  const save = () => {
    onSave(val)
    setEditing(false)
  }

  return (
    <div className="kv-row">
      <span className="k">{label}</span>
      {editing ? (
        <span className="flex" style={{ gap: 6 }}>
          <input
            className="input"
            style={{ padding: '5px 10px', fontSize: 13, width: 180 }}
            value={val}
            autoFocus
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') save() }}
          />
          <button className="btn btn-royal btn-sm" onClick={save} aria-label={`Save ${label}`}><Check size={13} /></button>
          <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)} aria-label={`Cancel editing ${label}`}><X size={13} /></button>
        </span>
      ) : (
        <span className="v flex" style={{ gap: 8 }}>
          {value || '—'}
          <button className="input-toggle" onClick={() => { setVal(value ?? ''); setEditing(true) }} aria-label={`Edit ${label}`}>
            {icon || <Pencil size={13} />}
          </button>
        </span>
      )}
    </div>
  )
}
