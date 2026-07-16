import { z } from 'zod'

// ═══════════════════════════════════════════════════════════════
// SHARED ZOD SCHEMAS
//
// Used at every API boundary to validate inbound resume + job data.
// Replaces the previous z.any() / z.record(z.unknown()) pattern.
//
// All schemas use .passthrough() to allow forward-compatible extra
// fields — we validate what we need, ignore what we don't.
// ═══════════════════════════════════════════════════════════════

// ── Leaf schemas ──────────────────────────────────────────────

export const ExperienceSchema = z.object({
  company: z.string().max(300),
  role: z.string().max(300),
  dates: z.string().max(100),
  location: z.string().max(200).optional(),
  bullets: z.array(z.string().max(2000)).max(50),
}).passthrough()

export const EducationSchema = z.object({
  institution: z.string().max(300),
  degree: z.string().max(200),
  field: z.string().max(200),
  dates: z.string().max(100),
}).passthrough()

export const ProjectSchema = z.object({
  name: z.string().max(300),
  description: z.string().max(5000),
  techStack: z.array(z.string().max(100)).max(50),
  link: z.string().max(2048),
}).passthrough()

export const CertificationSchema = z.object({
  name: z.string().max(300),
  issuer: z.string().max(300),
  date: z.string().max(100),
}).passthrough()

export const LanguageSchema = z.object({
  name: z.string().max(100),
  proficiency: z.string().max(50),
}).passthrough()

export const CustomSectionSchema = z.object({
  title: z.string().max(200),
  bullets: z.array(z.string().max(2000)).max(50),
  id: z.string().max(50).optional(),
}).passthrough()

// ── Composite resume schema ───────────────────────────────────
// Used by: chat, copilot, ats-match, tailor, cover-letter, parse-resume
// Allows extra fields via .passthrough() — validates structure of
// known fields without rejecting unknown forward-compatible keys.

export const ResumeDataSchema = z.object({
  id: z.string().max(100).optional(),
  name: z.string().max(300).optional(),
  role: z.string().max(300).optional(),
  persona: z.string().max(300).optional(),
  email: z.string().max(254).optional(),
  phone: z.string().max(50).optional(),
  location: z.string().max(200).optional(),
  github: z.string().max(2048).optional(),
  photoUrl: z.string().max(2048).optional(),
  score: z.number().optional(),
  updated: z.string().max(100).optional(),
  summary: z.string().max(10000).optional(),
  skills: z.array(z.string().max(100)).max(200).optional(),
  experience: z.array(ExperienceSchema).max(50).optional(),
  education: z.array(EducationSchema).max(30).optional(),
  projects: z.array(ProjectSchema).max(30).optional(),
  certifications: z.array(CertificationSchema).max(30).optional(),
  languages: z.array(LanguageSchema).max(30).optional(),
  customSections: z.array(CustomSectionSchema).max(20).optional(),
  companies: z.array(z.record(z.unknown())).max(50).optional(),
  stretch: z.array(z.record(z.unknown())).max(50).optional(),
  template: z.string().max(50).optional(),
  sectionOrder: z.array(z.string().max(50)).max(20).optional(),
  sectionVisibility: z.record(z.string(), z.boolean()).optional(),
}).passthrough()

// ── Job description schema (for tailor, ats-match) ────────────

export const JobDataSchema = z.object({
  title: z.string().max(300).optional(),
  company: z.string().max(300).optional(),
  location: z.string().max(200).optional(),
  description: z.string().max(30000).optional(),
  requirements: z.array(z.string().max(2000)).max(100).optional(),
  qualifications: z.array(z.string().max(2000)).max(100).optional(),
}).passthrough()

// ── Chat message schema (for chat, copilot) ──────────────────

export const ChatMessageSchema = z.object({
  id: z.string().max(200).optional(),
  role: z.enum(['user', 'assistant', 'system', 'tool']).catch('user'),
  content: z.string().max(20000).optional().default(''),
  parts: z.array(z.unknown()).optional(),
}).passthrough()

export const ChatMessagesSchema = z.array(ChatMessageSchema).max(50)

// ── Chat context schema ──────────────────────────────────────

export const ChatContextSchema = z.object({
  activeResume: ResumeDataSchema.optional(),
}).passthrough().optional()

// ── Application board schema ─────────────────────────────────

export const PipelineJobSchema = z.object({
  key: z.string().max(200),
  applicationId: z.string().max(100).optional(),
  logo: z.string().max(2048).optional(),
  color: z.string().max(20).optional(),
  company: z.string().max(300),
  title: z.string().max(300),
  loc: z.string().max(200).optional(),
  score: z.number().optional(),
  level: z.enum(['high', 'mid']).optional(),
  time: z.string().max(50).optional(),
  url: z.string().max(2048).optional(),
  resume: z.string().max(100).optional(),
}).passthrough()

export const ApplicationBoardSchema = z.object({
  bookmark: z.array(PipelineJobSchema).max(500).optional(),
  applied: z.array(PipelineJobSchema).max(500).optional(),
  interviewing: z.array(PipelineJobSchema).max(500).optional(),
  offers: z.array(PipelineJobSchema).max(500).optional(),
  rejected: z.array(PipelineJobSchema).max(500).optional(),
}).passthrough()

// ── Application record schemas (for individual-record API) ──

export const CreateApplicationSchema = z.object({
  sourceKey: z.string().max(200),
  company: z.string().max(300),
  jobTitle: z.string().max(300),
  jobUrl: z.string().max(2048).optional(),
  location: z.string().max(200).optional(),
  salary: z.string().max(200).optional(),
  logoUrl: z.string().max(2048).optional(),
  color: z.string().max(20).optional(),
  level: z.string().max(10).optional(),
  matchScore: z.number().optional(),
  resumeId: z.string().max(100).nullable().optional(),
  status: z.enum(['bookmarked', 'applied', 'interviewing', 'offered', 'rejected']).optional(),
  jobData: z.record(z.unknown()).optional(),
})

export const ReorderApplicationSchema = z.object({
  updates: z.array(z.object({
    id: z.string().max(100),
    status: z.enum(['bookmarked', 'applied', 'interviewing', 'offered', 'rejected']),
    position: z.number(),
  })).max(500),
})
