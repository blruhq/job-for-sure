import { pgTable, text, boolean, jsonb, timestamp, check } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const resumes = pgTable('resumes', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  data: jsonb('data').notNull(),
  isBase: boolean('is_base').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const tailoredResumes = pgTable('tailored_resumes', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  baseResumeId: text('base_resume_id').references(() => resumes.id),
  jobUrl: text('job_url'),
  jobData: jsonb('job_data'),
  data: jsonb('data').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})

export const applications = pgTable('applications', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  company: text('company').notNull(),
  jobTitle: text('job_title').notNull(),
  jobUrl: text('job_url'),
  status: text('status').default('bookmarked'),
  tailoredResumeId: text('tailored_resume_id').references(() => tailoredResumes.id),
  notes: text('notes'),
  appliedAt: timestamp('applied_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})
