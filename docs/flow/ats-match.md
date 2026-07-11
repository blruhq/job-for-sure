# Flow Spec: ATS Resume Matching

## User Story
> As a user, I want to paste a job description and see how well my resume matches it, with specific missing skills and recommendations.

## Entry Points
- Chat → "Check my match for this job"
- Resume Detail → "ATS Match" (if implemented as tab)
- Cover Letter → "Match my resume first"

## Flow States

### Input
```
User pastes job description (URL or text)
├── If URL: try to scrape JD text from page
│   └── Scrape fails → user pastes manually
└── If text: use directly
```

### Analysis
```
1. Send resume + JD to AI via generateTextWithFailover()
2. AI returns structured analysis:
   {
     score: number,           // 0-100 overall match
     matchedSkills: string[], // skills found in both
     missingSkills: string[], // in JD but not in resume
     weakAreas: string[],     // present but could be stronger
     recommendations: string[] // actionable improvements
   }
3. Display results
```

### Results Display
```
┌──────────────────────────────────────────────────┐
│  Match Score: 72%                                │
│  ─────────────────────────────────────────       │
│                                                   │
│  ✓ Matched Skills           ✗ Missing Skills      │
│  ───────────────           ─────────────────      │
│  React                       Docker                │
│  TypeScript                  Kubernetes            │
│  Node.js                     CI/CD                 │
│  PostgreSQL                                         │
│                                                    │
│  💡 Recommendations:                               │
│  1. Add Docker experience to your most recent role │
│  2. Mention any CI/CD work even if incidental      │
│  3. Quantify impact with metrics                   │
│                                                    │
│  [View Full Resume]  [Generate Cover Letter]       │
│  [Tailor Resume for This Job]                      │
└──────────────────────────────────────────────────┘
```

### Actions
```
├── "Tailor Resume for This Job" →
│   Creates TailoredResume with AI-optimized content
│   Redirects to editor with suggestions applied
├── "Generate Cover Letter" →
│   Creates cover letter incorporating matching context
└── "View Full Resume" →
│   Switches to resume detail page
```

## Edge Cases
- **No match**: User's resume is completely unrelated to JD → show 0% with "This job requires a different skillset. Consider focusing on roles matching your experience."
- **Empty resume**: User hasn't created a resume yet → redirect to resume creation
- **JD too short**: Pasted text is <20 words → "This job description seems incomplete. For best results, paste the full description."
