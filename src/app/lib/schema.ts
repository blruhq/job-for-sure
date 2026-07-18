import { relations } from "drizzle-orm";
import { pgTable, pgEnum, text, timestamp, boolean, jsonb, integer, numeric, index } from "drizzle-orm/pg-core";

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
  // ── Better Auth admin plugin fields ──
  role: text("role").default("user").notNull(),
  banned: boolean("banned").default(false).notNull(),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // ── Better Auth admin plugin field ──
    impersonatedBy: text("impersonated_by"),
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
      .defaultNow()
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

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

// ═══════════════════════════════════════════════════════════════
// APPLICATION STATUS ENUM
// ═══════════════════════════════════════════════════════════════

export const applicationStatus = pgEnum("application_status", [
  "bookmarked",
  "applied",
  "interviewing",
  "offered",
  "rejected",
]);

// ═══════════════════════════════════════════════════════════════
// RESUMES
// ═══════════════════════════════════════════════════════════════

export const resumes = pgTable("resumes", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  data: jsonb("data").notNull(),
  isBase: boolean("is_base").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [index("resumes_userId_idx").on(table.userId)]);

export const resumeRelations = relations(resumes, ({ one }) => ({
  user: one(user, { fields: [resumes.userId], references: [user.id] }),
}));

// ═══════════════════════════════════════════════════════════════
// APPLICATIONS (individual records — replaces applications_data blob)
// ═══════════════════════════════════════════════════════════════

export const applications = pgTable("applications", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  sourceKey: text("source_key").notNull(),
  company: text("company").notNull(),
  jobTitle: text("job_title").notNull(),
  jobUrl: text("job_url"),
  location: text("location"),
  salary: text("salary"),
  logoUrl: text("logo_url"),
  color: text("color"),
  level: text("level"),
  status: applicationStatus("status").default("bookmarked").notNull(),
  position: integer("position").default(0).notNull(),
  matchScore: integer("match_score"),
  resumeId: text("resume_id").references(() => resumes.id, { onDelete: "set null" }),
  coverLetterId: text("cover_letter_id").references(() => coverLetters.id, { onDelete: "set null" }),
  notes: text("notes"),
  jobData: jsonb("job_data"),
  appliedAt: timestamp("applied_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("applications_userId_idx").on(table.userId),
  index("applications_userId_status_idx").on(table.userId, table.status),
]);

export const applicationsRelations = relations(applications, ({ one }) => ({
  user: one(user, { fields: [applications.userId], references: [user.id] }),
  resume: one(resumes, { fields: [applications.resumeId], references: [resumes.id] }),
  coverLetter: one(coverLetters, { fields: [applications.coverLetterId], references: [coverLetters.id] }),
}));

// ═══════════════════════════════════════════════════════════════
// USER PREFERENCES
// ═══════════════════════════════════════════════════════════════

export const userPreferences = pgTable("user_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  emailNotifications: boolean("email_notifications").default(true).notNull(),
  weeklyDigest: boolean("weekly_digest").default(false).notNull(),
  marketingEmails: boolean("marketing_emails").default(false).notNull(),
  homeLocation: text("home_location"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(user, { fields: [userPreferences.userId], references: [user.id] }),
}));

// ═══════════════════════════════════════════════════════════════
// INTERVIEW SESSIONS
// ═══════════════════════════════════════════════════════════════

export const interviewSessions = pgTable("interview_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  resumeId: text("resume_id").references(() => resumes.id, { onDelete: "set null" }),
  company: text("company").notNull(),
  role: text("role").notNull(),
  type: text("type").notNull(),
  difficulty: text("difficulty").notNull(),
  score: numeric("score", { precision: 3, scale: 1, mode: 'number' }).notNull(),
  exchanges: jsonb("exchanges").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [index("interview_sessions_userId_idx").on(table.userId)]);

export const interviewSessionsRelations = relations(interviewSessions, ({ one }) => ({
  user: one(user, { fields: [interviewSessions.userId], references: [user.id] }),
  resume: one(resumes, { fields: [interviewSessions.resumeId], references: [resumes.id] }),
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
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [index("cover_letters_userId_idx").on(table.userId)]);

export const coverLettersRelations = relations(coverLetters, ({ one }) => ({
  user: one(user, { fields: [coverLetters.userId], references: [user.id] }),
  resume: one(resumes, { fields: [coverLetters.resumeId], references: [resumes.id] }),
}));
