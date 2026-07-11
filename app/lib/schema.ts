import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, jsonb, index } from "drizzle-orm/pg-core";

// ═══════════════════════════════════════════════════════════════
// BETTER AUTH TABLES
// ═══════════════════════════════════════════════════════════════

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

// ═══════════════════════════════════════════════════════════════
// AUTH RELATIONS
// ═══════════════════════════════════════════════════════════════

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

// ═══════════════════════════════════════════════════════════════
// APPLICATION TABLES
// ═══════════════════════════════════════════════════════════════

export const resumes = pgTable("resumes", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  data: jsonb("data").notNull(),
  isBase: boolean("is_base").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tailoredResumes = pgTable("tailored_resumes", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  baseResumeId: text("base_resume_id").references(() => resumes.id, { onDelete: "set null" }),
  jobUrl: text("job_url"),
  jobData: jsonb("job_data"),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const applications = pgTable("applications", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  company: text("company").notNull(),
  jobTitle: text("job_title").notNull(),
  jobUrl: text("job_url"),
  status: text("status").default("bookmarked"),
  tailoredResumeId: text("tailored_resume_id").references(() => tailoredResumes.id, { onDelete: "set null" }),
  notes: text("notes"),
  appliedAt: timestamp("applied_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ═══════════════════════════════════════════════════════════════
// APPLICATION RELATIONS
// ═══════════════════════════════════════════════════════════════

export const userPreferences = pgTable("user_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  emailNotifications: boolean("email_notifications").default(true).notNull(),
  weeklyDigest: boolean("weekly_digest").default(false).notNull(),
  marketingEmails: boolean("marketing_emails").default(false).notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const pipelineData = pgTable("pipeline_data", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  data: jsonb("data").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const resumeRelations = relations(resumes, ({ one }) => ({
  user: one(user, {
    fields: [resumes.userId],
    references: [user.id],
  }),
}));

export const interviewSessions = pgTable("interview_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  resumeId: text("resume_id").references(() => resumes.id, { onDelete: "set null" }),
  company: text("company").notNull(),
  role: text("role").notNull(),
  type: text("type").notNull(), // behavioral | technical | mixed
  difficulty: text("difficulty").notNull(), // entry | mid | senior
  score: text("score").notNull(), // average score, e.g. "8.2"
  exchanges: jsonb("exchanges").notNull(), // JSON array of InterviewExchange
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const interviewSessionsRelations = relations(interviewSessions, ({ one }) => ({
  user: one(user, {
    fields: [interviewSessions.userId],
    references: [user.id],
  }),
  resume: one(resumes, {
    fields: [interviewSessions.resumeId],
    references: [resumes.id],
  }),
}));

// ═══════════════════════════════════════════════════════════════
// COVER LETTERS
// ═══════════════════════════════════════════════════════════════

export const coverLetters = pgTable("cover_letters", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  resumeId: text("resume_id").references(() => resumes.id, { onDelete: "set null" }),
  company: text("company"),
  role: text("role"),
  content: text("content").notNull(),
  jdText: text("jd_text"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const coverLettersRelations = relations(coverLetters, ({ one }) => ({
  user: one(user, {
    fields: [coverLetters.userId],
    references: [user.id],
  }),
  resume: one(resumes, {
    fields: [coverLetters.resumeId],
    references: [resumes.id],
  }),
}));
