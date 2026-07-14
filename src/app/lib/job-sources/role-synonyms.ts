// ═══════════════════════════════════════════════════════════════
// ROLE SYNONYMS — Query expansion for broader job matching
//
// Problem: "Junior Software Engineer" returns 1 job on JobbKK because
// Thai companies post titles like "Developer", "โปรแกรมเมอร์", "Web Developer".
// This module expands the query to include related terms so more jobs match.
//
// Two functions:
//   expandQueryTerms(query)    → all related keywords (English + Thai)
//   getBroadSearchTerm(query)  → single broad term for source search APIs
// ═══════════════════════════════════════════════════════════════

// ── Role Groups ──────────────────────────────────────────────
// Each group is a cluster of interchangeable role keywords.
// If the user's query matches ANY term, ALL terms in the group are used.
// `broadSearch` is the best single term to send to job board search APIs.
interface RoleGroup {
  terms: string[]      // all interchangeable keywords
  broadSearch: string  // shortest effective search term for APIs
}

const ROLE_GROUPS: RoleGroup[] = [
  // ── Software Development ──
  {
    terms: ['software engineer', 'software developer', 'developer', 'programmer', 'web developer', 'software dev', 'application developer'],
    broadSearch: 'developer',
  },
  {
    terms: ['frontend developer', 'frontend engineer', 'front-end', 'front end', 'react developer', 'vue developer'],
    broadSearch: 'frontend',
  },
  {
    terms: ['backend developer', 'backend engineer', 'back-end', 'back end', 'api developer', 'node developer'],
    broadSearch: 'backend',
  },
  {
    terms: ['full stack developer', 'fullstack', 'full-stack', 'full stack engineer'],
    broadSearch: 'developer',
  },
  {
    terms: ['mobile developer', 'ios developer', 'android developer', 'flutter developer', 'react native'],
    broadSearch: 'mobile developer',
  },

  // ── Data & AI ──
  {
    terms: ['data scientist', 'data analyst', 'data engineer', 'machine learning engineer', 'ai engineer', 'ml engineer'],
    broadSearch: 'data',
  },
  {
    terms: ['devops engineer', 'devops', 'sre', 'site reliability', 'infrastructure engineer', 'cloud engineer', 'platform engineer'],
    broadSearch: 'devops',
  },

  // ── Design ──
  {
    terms: ['ui designer', 'ux designer', 'product designer', 'graphic designer', 'web designer', 'ui/ux', 'ux/ui'],
    broadSearch: 'designer',
  },

  // ── QA & Testing ──
  {
    terms: ['qa engineer', 'quality assurance', 'software tester', 'test engineer', 'qa automation', 'manual tester'],
    broadSearch: 'qa',
  },

  // ── Product ──
  {
    terms: ['product manager', 'product owner', 'product analyst'],
    broadSearch: 'product manager',
  },

  // ── IT & Support ──
  {
    terms: ['it support', 'system administrator', 'sysadmin', 'it engineer', 'helpdesk', 'technical support', 'it technician'],
    broadSearch: 'IT',
  },

  // ── Marketing ──
  {
    terms: ['marketing manager', 'marketing specialist', 'digital marketing', 'content marketing', 'marketing', 'seo specialist', 'social media manager'],
    broadSearch: 'marketing',
  },

  // ── Sales ──
  {
    terms: ['sales manager', 'sales representative', 'account executive', 'business development', 'sales', 'account manager'],
    broadSearch: 'sales',
  },

  // ── Finance & Accounting ──
  {
    terms: ['financial analyst', 'finance manager', 'accountant', 'accounting', 'finance', 'auditor', 'bookkeeper', 'tax accountant'],
    broadSearch: 'accounting',
  },

  // ── HR & People ──
  {
    terms: ['hr manager', 'recruiter', 'talent acquisition', 'human resources', 'people operations', 'hr generalist', 'hr'],
    broadSearch: 'HR',
  },

  // ── Admin ──
  {
    terms: ['administrative assistant', 'office manager', 'executive assistant', 'secretary', 'admin', 'receptionist'],
    broadSearch: 'admin',
  },

  // ── Operations ──
  {
    terms: ['operations manager', 'operations analyst', 'supply chain', 'logistics', 'warehouse manager'],
    broadSearch: 'operations',
  },

  // ── Engineering (non-software) ──
  {
    terms: ['mechanical engineer', 'electrical engineer', 'civil engineer', 'project engineer', 'chemical engineer'],
    broadSearch: 'engineer',
  },

  // ── Writing & Content ──
  {
    terms: ['content writer', 'copywriter', 'technical writer', 'content creator', 'content strategist'],
    broadSearch: 'content',
  },

  // ── Project Management ──
  {
    terms: ['project manager', 'scrum master', 'project coordinator', 'agile coach', 'program manager'],
    broadSearch: 'project manager',
  },

  // ── Security ──
  {
    terms: ['security engineer', 'cybersecurity', 'information security', 'security analyst', 'penetration tester'],
    broadSearch: 'security',
  },

  // ── Customer Service ──
  {
    terms: ['customer service', 'customer support', 'customer success', 'client relations', 'call center'],
    broadSearch: 'customer service',
  },
]

// ── Thai translations for role keywords ─────────────────────
// Maps English role keywords → Thai equivalents.
// Used in filterByQuery so Thai-language job titles match English queries.
const THAI_ROLE_MAP: Record<string, string[]> = {
  'developer':      ['นักพัฒนา', 'นักพัฒนาซอฟต์แวร์', 'เดเวลอปเปอร์'],
  'programmer':     ['โปรแกรมเมอร์', 'นักเขียนโปรแกรม'],
  'software':       ['ซอฟต์แวร์'],
  'engineer':       ['วิศวกร'],
  'designer':       ['นักออกแบบ', 'ดีไซเนอร์'],
  'graphic':        ['กราฟิก'],
  'frontend':       ['ฟรอนต์เอนด์'],
  'backend':        ['แบ็กเอนด์'],
  'marketing':      ['การตลาด', 'มาร์เก็ตติ้ง'],
  'sales':          ['พนักงานขาย', 'การขาย', 'เซลส์'],
  'accounting':     ['บัญชี', 'พนักงานบัญชี'],
  'accountant':     ['บัญชี', 'พนักงานบัญชี'],
  'finance':        ['การเงิน'],
  'manager':        ['ผู้จัดการ'],
  'admin':          ['งานธุรการ', 'ธุรการ'],
  'administrator':  ['ผู้ดูแลระบบ'],
  'data':           ['ข้อมูล', 'ดาต้า'],
  'analyst':        ['นักวิเคราะห์'],
  'test':           ['ทดสอบ'],
  'qa':             ['ประกันคุณภาพ'],
  'security':       ['ความมั่นคงปลอดภัย', 'รักษาความปลอดภัย'],
  'support':        ['สนับสนุน', 'ช่วยเหลือ'],
  'content':        ['เนื้อหา', 'คอนเทนต์'],
  'writer':         ['นักเขียน', 'คอนเทนต์ไรเตอร์'],
  'recruiter':      ['นักสรรหา'],
  'operations':     ['ปฏิบัติการ', 'ดำเนินงาน'],
  'project':        ['โครงการ', 'โปรเจกต์'],
  'product':        ['ผลิตภัณฑ์'],
  'cloud':          ['คลาวด์'],
  'network':        ['เครือข่าย', 'เน็ตเวิร์ก'],
  'system':         ['ระบบ'],
  'web':            ['เว็บ', 'เว็บไซต์'],
  'mobile':         ['มือถือ', 'โมบาย'],
  'business':       ['ธุรกิจ'],
  'service':        ['บริการ'],
  'customer':       ['ลูกค้า'],
}

// ── Expand query into all related keywords ───────────────────
// Returns array of lowercase keywords including English synonyms + Thai translations.
// Used by filterByQuery to match against job title/description.
export function expandQueryTerms(query: string): string[] {
  const lower = query.toLowerCase().trim()
  const expanded = new Set<string>()

  // Always include original query terms (length > 2)
  lower.split(/\s+/).filter(t => t.length > 2).forEach(t => expanded.add(t))

  // Check each role group — if query matches any term, add ALL terms
  for (const group of ROLE_GROUPS) {
    const matched = group.terms.some(term => lower.includes(term))
    if (matched) {
      group.terms.forEach(term => {
        term.split(/\s+/).forEach(w => {
          if (w.length > 2) expanded.add(w)
        })
      })
    }
  }

  // Add Thai translations for each English keyword
  for (const term of [...expanded]) {
    const thai = THAI_ROLE_MAP[term]
    if (thai) thai.forEach(t => expanded.add(t))
  }

  return Array.from(expanded)
}

// ── Get broad search term for source APIs ───────────────────
// Returns the best single keyword to send to job board search APIs.
// "Junior Software Engineer" → "developer"
// "Senior Marketing Manager" → "marketing"
export function getBroadSearchTerm(query: string): string {
  const lower = query.toLowerCase().trim()

  // Check role groups for a match
  for (const group of ROLE_GROUPS) {
    if (group.terms.some(term => lower.includes(term))) {
      return group.broadSearch
    }
  }

  // No role group matched — strip level modifiers and return the rest
  const stripped = lower
    .replace(/\b(junior|senior|lead|principal|staff|mid|entry|level|associate)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  return stripped || query
}
