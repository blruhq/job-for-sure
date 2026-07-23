# PLAN: Fix "Processing..." Spinner After Upload

## Problem

After uploading a resume, the "Processing..." spinner shows forever. This is because the injected upload card message has `role: 'user'` and it's the LAST message. The message list logic shows "Processing..." whenever the last message is a user message with no assistant response after it.

## Fix

Inject a short assistant acknowledgment message right after the upload card user message. Then the last message is `assistant`, and the spinner disappears.

**File:** `app/components/chat/chat-view.tsx`

---

## Step 1: Fix `handleFileChange` — add assistant ack message

FIND (lines 196-205):

```tsx
      const uploadText = `📎 Resume uploaded: ${resume.persona || 'Unknown'}${resume.role ? ` — ${resume.role}` : ''}`
      setMessages(prev => [...prev, {
        id: `upload-${Date.now()}`,
        role: 'user',
        parts: [
          { type: 'data-upload', data: { resumeId: resume.id } },
          { type: 'text', text: uploadText },
        ],
        createdAt: new Date(),
      } as any])
```

REPLACE with:

```tsx
      const uploadText = `📎 Resume uploaded: ${resume.persona || 'Unknown'}${resume.role ? ` — ${resume.role}` : ''}`
      const ackText = resume.role
        ? `Great! I've parsed your resume. I can see you're a **${resume.role}**. I found ${resume.skills.length} skills in your profile. Ask me anything — I have your full resume context.`
        : `Great! I've parsed your resume. Ask me anything — I have your full resume context.`
      setMessages(prev => [...prev, {
        id: `upload-${Date.now()}`,
        role: 'user',
        parts: [
          { type: 'data-upload', data: { resumeId: resume.id } },
          { type: 'text', text: uploadText },
        ],
        createdAt: new Date(),
      } as any, {
        id: `upload-ack-${Date.now()}`,
        role: 'assistant',
        parts: [{ type: 'text', text: ackText }],
        createdAt: new Date(),
      } as any])
```

---

## Step 2: Fix `handleWizardComplete` — same pattern

FIND (lines 239-248):

```tsx
      const uploadText = `📎 Resume created: ${resume.persona || 'Unknown'}${resume.role ? ` — ${resume.role}` : ''}`
      setMessages(prev => [...prev, {
        id: `upload-${Date.now()}`,
        role: 'user',
        parts: [
          { type: 'data-upload', data: { resumeId: resume.id } },
          { type: 'text', text: uploadText },
        ],
        createdAt: new Date(),
      } as any])
```

REPLACE with:

```tsx
      const uploadText = `📎 Resume created: ${resume.persona || 'Unknown'}${resume.role ? ` — ${resume.role}` : ''}`
      const ackText = resume.role
        ? `Great! I've created your resume profile. You're targeting **${resume.role}** roles. Ask me anything — I have your full resume context.`
        : `Great! I've created your resume profile. Ask me anything — I have your full resume context.`
      setMessages(prev => [...prev, {
        id: `upload-${Date.now()}`,
        role: 'user',
        parts: [
          { type: 'data-upload', data: { resumeId: resume.id } },
          { type: 'text', text: uploadText },
        ],
        createdAt: new Date(),
      } as any, {
        id: `upload-ack-${Date.now()}`,
        role: 'assistant',
        parts: [{ type: 'text', text: ackText }],
        createdAt: new Date(),
      } as any])
```

---

## Step 3: Verify and commit

```bash
npx tsc --noEmit
pnpm build
git add -A && git commit -m "fix: add assistant ack message after upload to stop infinite Processing spinner" && git push
```

If `tsc` or `build` fails, DO NOT commit. Fix the error first.

---

## Why This Works

```
BEFORE (broken):
messages: [ { role: 'user', ... } ]  ← last message is user, no assistant
→ showPlanning = true → "Processing..." spinner forever 🔄

AFTER (fixed):
messages: [ { role: 'user', ... }, { role: 'assistant', text: 'Great!...' } ]
                                      ← last message is assistant
→ showPlanning = false → no spinner ✅
```
