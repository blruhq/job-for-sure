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

  // ── 3D, Animation & VFX ──
  {
    terms: ['3d artist', '3d modeler', '3d designer', '3d animator', '3d generalist', 'animator', 'motion graphics', 'motion designer', 'vfx artist', 'visual effects', 'character animator', 'cg artist'],
    broadSearch: '3d',
  },

  // ── Creative Direction & Illustration ──
  {
    terms: ['art director', 'creative director', 'creative lead', 'illustrator', 'visual designer', 'brand designer'],
    broadSearch: 'creative',
  },

  // ── Video, Film & Photography ──
  {
    terms: ['video editor', 'videographer', 'video producer', 'photographer', 'photo editor', 'film producer', 'camera operator', 'media producer'],
    broadSearch: 'video',
  },

  // ── Game Development ──
  {
    terms: ['game designer', 'game developer', 'level designer', 'unity developer', 'unreal developer', 'gameplay programmer', 'game artist'],
    broadSearch: 'game',
  },

  // ── Education & Training ──
  {
    terms: ['teacher', 'tutor', 'instructor', 'lecturer', 'trainer', 'teaching assistant', 'education coordinator', 'curriculum designer'],
    broadSearch: 'teacher',
  },

  // ── Legal ──
  {
    terms: ['lawyer', 'attorney', 'paralegal', 'legal counsel', 'legal advisor', 'legal assistant', 'compliance officer'],
    broadSearch: 'legal',
  },

  // ── Healthcare & Medical ──
  {
    terms: ['nurse', 'pharmacist', 'doctor', 'physician', 'medical technician', 'medical assistant', 'therapist', 'dentist', 'healthcare assistant', 'radiologist'],
    broadSearch: 'medical',
  },

  // ── Hospitality & Tourism ──
  {
    terms: ['chef', 'cook', 'bartender', 'barista', 'waiter', 'waitress', 'hotel manager', 'tour guide', 'restaurant manager', 'housekeeper', 'receptionist'],
    broadSearch: 'hospitality',
  },

  // ── Architecture & Interior Design ──
  {
    terms: ['architect', 'interior designer', 'landscape architect', 'urban planner', 'cad designer', 'draftsman', 'site inspector'],
    broadSearch: 'architect',
  },

  // ── Real Estate ──
  {
    terms: ['real estate agent', 'property manager', 'real estate consultant', 'leasing agent', 'property consultant', 'real estate'],
    broadSearch: 'real estate',
  },

  // ── Transportation ──
  {
    terms: ['driver', 'pilot', 'dispatcher', 'delivery driver', 'truck driver', 'flight attendant', 'courier'],
    broadSearch: 'driver',
  },

  // ── Consulting ──
  {
    terms: ['management consultant', 'strategy consultant', 'business consultant', 'advisory', 'consultant'],
    broadSearch: 'consultant',
  },

  // ── Events ──
  {
    terms: ['event planner', 'event coordinator', 'event manager', 'wedding planner', 'conference organizer'],
    broadSearch: 'event',
  },

  // ── Translation & Localization ──
  {
    terms: ['translator', 'interpreter', 'localization specialist', 'subtitler', 'linguist'],
    broadSearch: 'translator',
  },

  // ── Skilled Trades ──
  {
    terms: ['electrician', 'plumber', 'mechanic', 'carpenter', 'welder', 'technician', 'maintenance worker', 'machine operator'],
    broadSearch: 'technician',
  },

  // ── Research & Academia ──
  {
    terms: ['researcher', 'research assistant', 'research analyst', 'scientist', 'lab technician', 'academic'],
    broadSearch: 'research',
  },

  // ── Fashion & Textile ──
  {
    terms: ['fashion designer', 'textile designer', 'fashion stylist', 'pattern maker', 'merchandiser', 'garment technician'],
    broadSearch: 'fashion',
  },

  // ── Music & Audio ──
  {
    terms: ['music producer', 'sound engineer', 'audio engineer', 'musician', 'composer', 'sound designer', 'audio technician'],
    broadSearch: 'music',
  },

  // ── Insurance ──
  {
    terms: ['insurance agent', 'underwriter', 'claims adjuster', 'insurance broker', 'actuary', 'risk analyst'],
    broadSearch: 'insurance',
  },

  // ── Quality, Safety & Inspection ──
  {
    terms: ['safety officer', 'quality control', 'quality inspector', 'compliance auditor', 'ehs officer', 'qc inspector'],
    broadSearch: 'safety',
  },

  // ── Supply Chain & Procurement ──
  {
    terms: ['procurement officer', 'purchasing manager', 'buyer', 'supply chain analyst', 'inventory manager', 'sourcing specialist'],
    broadSearch: 'procurement',
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
  // ── Expanded translations ──
  'creative':       ['สร้างสรรค์', 'ครีเอทีฟ'],
  'video':          ['วิดีโอ'],
  'photographer':   ['ช่างภาพ', 'ถ่ายภาพ'],
  'animator':       ['อนิเมเตอร์', 'แอนิเมชัน'],
  'teacher':        ['ครู', 'อาจารย์', 'ผู้สอน'],
  'instructor':     ['ผู้สอน', 'ครูฝึกสอน'],
  'trainer':        ['ผู้ฝึกอบรม', 'เทรนเนอร์'],
  'legal':          ['กฎหมาย', 'นิติกร'],
  'lawyer':         ['ทนายความ', 'ทนาย'],
  'attorney':       ['ทนายความ'],
  'medical':        ['การแพทย์', 'แพทย์'],
  'nurse':          ['พยาบาล'],
  'pharmacist':     ['เภสัชกร'],
  'doctor':         ['แพทย์', 'หมอ'],
  'dentist':        ['ทันตแพทย์', 'หมอฟัน'],
  'hospitality':    ['บริการ', 'การท่องเที่ยว', 'โรงแรม'],
  'chef':           ['พ่อครัว', 'แม่ครัว'],
  'cook':           ['พ่อครัว', 'แม่ครัว', 'ครัว'],
  'hotel':          ['โรงแรม'],
  'restaurant':     ['ร้านอาหาร'],
  'tour':           ['ท่องเที่ยว', 'ไกด์'],
  'architect':      ['สถาปนิก'],
  'interior':       ['ตกแต่งภายใน', 'ออกแบบภายใน'],
  'real estate':    ['อสังหาริมทรัพย์'],
  'property':       ['ทรัพย์สิน', 'อสังหา'],
  'driver':         ['พนักงานขับรถ', 'คนขับ'],
  'pilot':          ['นักบิน'],
  'consultant':     ['ที่ปรึกษา'],
  'event':          ['อีเวนต์', 'จัดงาน'],
  'translator':     ['นักแปล', 'ล่าม'],
  'interpreter':    ['ล่าม', 'แปล'],
  'technician':     ['ช่างเทคนิค', 'ช่าง'],
  'electrician':    ['ช่างไฟ', 'ช่างไฟฟ้า'],
  'plumber':        ['ช่างประปา'],
  'mechanic':       ['ช่างยนต์', 'ช่างซ่อม'],
  'research':       ['วิจัย', 'นักวิจัย'],
  'researcher':     ['นักวิจัย'],
  'fashion':        ['แฟชั่น', 'เสื้อผ้า'],
  'music':          ['ดนตรี', 'เสียง'],
  'audio':          ['เสียง', 'audio'],
  'insurance':      ['ประกัน', 'ประกันภัย'],
  'safety':         ['ความปลอดภัย', 'ปลอดภัย'],
  'quality':        ['คุณภาพ'],
  'game':           ['เกม', 'เกมม์'],
  'procurement':    ['จัดซื้อ', 'จัดซื้อจัดจ้าง'],
  'purchasing':     ['จัดซื้อ', 'น่าซื้อ'],
  'buyer':          ['พนักงานจัดซื้อ', 'นักซื้อ'],
  'inventory':      ['สินค้าคงคลัง', 'คลังสินค้า'],
  'logistics':      ['โลจิสติกส์', 'การขนส่ง'],
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
