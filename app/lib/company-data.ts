import type { Company, Resume } from '~/types/resume'

// ═══════════════════════════════════════════════════════════════
// COMPANY DATABASE — Same as demo
// ═══════════════════════════════════════════════════════════════

export const COMPANY_DB: Record<string, { direct: Company[]; stretch: Company[] }> = {
  frontend: {
    direct: [
      { logo: 'LN', color: '#5E6AD2', name: 'Linear', role: 'Lead Frontend Engineer', loc: 'Remote', work: 'remote', visa: true, salary: '$180-240k', score: 94, level: 'high', url: 'https://linear.app/careers' },
      { logo: 'CF', color: '#F38020', name: 'Cloudflare', role: 'Developer Advocate', loc: 'Austin, TX', work: 'hybrid', visa: true, salary: '$160-220k', score: 92, level: 'high', url: 'https://cloudflare.com/careers' },
      { logo: 'VC', color: '#000000', name: 'Vercel', role: 'Frontend Architect', loc: 'Remote', work: 'remote', visa: true, salary: '$190-240k', score: 90, level: 'high', url: 'https://vercel.com/careers' },
      { logo: 'ST', color: '#635BFF', name: 'Stripe', role: 'UI Engineer', loc: 'South San Francisco', work: 'onsite', visa: false, salary: '$185-245k', score: 86, level: 'high', url: 'https://stripe.com/jobs' },
      { logo: 'SB', color: '#3ECF8E', name: 'Supabase', role: 'Frontend Engineer', loc: 'Remote', work: 'remote', visa: true, salary: '$140-190k', score: 83, level: 'mid', url: 'https://supabase.com/careers' },
    ],
    stretch: [
      { logo: 'ST', color: '#635BFF', name: 'Stripe', role: 'QA Automation Engineer', loc: 'South San Francisco', work: 'hybrid', visa: false, salary: '$150-200k', score: 78, level: 'mid', url: 'https://stripe.com/jobs', missing: ['Cypress', 'Selenium', 'Test Automation'], transferable: ['JavaScript', 'TypeScript', 'CI/CD', 'Cross-browser Testing'] },
      { logo: 'CF', color: '#F38020', name: 'Cloudflare', role: 'Infrastructure Engineer', loc: 'Austin, TX', work: 'onsite', visa: true, salary: '$170-230k', score: 72, level: 'mid', url: 'https://cloudflare.com/careers', missing: ['Rust', 'Kubernetes', 'Terraform'], transferable: ['JavaScript', 'Performance Optimization', 'Networking'] },
      { logo: 'SB', color: '#3ECF8E', name: 'Supabase', role: 'Python Backend Engineer', loc: 'Remote', work: 'remote', visa: true, salary: '$140-190k', score: 68, level: 'mid', url: 'https://supabase.com/careers', missing: ['Python', 'Django', 'PostgreSQL Advanced'], transferable: ['API Design', 'Git', 'TypeScript', 'Databases'] },
    ],
  },
  backend: {
    direct: [
      { logo: 'ST', color: '#635BFF', name: 'Stripe', role: 'Backend Engineer', loc: 'South San Francisco', work: 'hybrid', visa: false, salary: '$190-260k', score: 95, level: 'high', url: 'https://stripe.com/jobs' },
      { logo: 'LN', color: '#5E6AD2', name: 'Linear', role: 'Full-Stack Engineer', loc: 'Remote', work: 'remote', visa: true, salary: '$180-240k', score: 92, level: 'high', url: 'https://linear.app/careers' },
      { logo: 'SB', color: '#3ECF8E', name: 'Supabase', role: 'Database Engineer', loc: 'Remote', work: 'remote', visa: true, salary: '$150-210k', score: 89, level: 'high', url: 'https://supabase.com/careers' },
      { logo: 'FL', color: '#7B3FF2', name: 'Fly.io', role: 'Platform Engineer', loc: 'Remote', work: 'remote', visa: true, salary: '$160-220k', score: 85, level: 'mid', url: 'https://fly.io/about' },
    ],
    stretch: [
      { logo: 'CF', color: '#F38020', name: 'Cloudflare', role: 'Frontend Engineer', loc: 'Austin, TX', work: 'hybrid', visa: true, salary: '$160-220k', score: 76, level: 'mid', url: 'https://cloudflare.com/careers', missing: ['React', 'CSS Advanced', 'Accessibility'], transferable: ['TypeScript', 'API Design', 'Performance'] },
      { logo: 'VC', color: '#000000', name: 'Vercel', role: 'QA Engineer', loc: 'Remote', work: 'remote', visa: false, salary: '$150-200k', score: 72, level: 'mid', url: 'https://vercel.com/careers', missing: ['Cypress', 'Playwright', 'Visual Regression'], transferable: ['Node.js', 'CI/CD', 'Testing'] },
    ],
  },
  design: {
    direct: [
      { logo: 'VC', color: '#000000', name: 'Vercel', role: 'Product Designer', loc: 'Remote', work: 'remote', visa: true, salary: '$160-220k', score: 90, level: 'high', url: 'https://vercel.com/careers' },
      { logo: 'FL', color: '#7B3FF2', name: 'Fly.io', role: 'Platform UI Designer', loc: 'Remote', work: 'remote', visa: true, salary: '$140-190k', score: 89, level: 'high', url: 'https://fly.io/about' },
      { logo: 'LN', color: '#5E6AD2', name: 'Linear', role: 'Product Designer', loc: 'Remote', work: 'remote', visa: true, salary: '$170-230k', score: 84, level: 'mid', url: 'https://linear.app/careers' },
    ],
    stretch: [
      { logo: 'ST', color: '#635BFF', name: 'Stripe', role: 'Frontend Engineer', loc: 'South San Francisco', work: 'onsite', visa: false, salary: '$185-245k', score: 75, level: 'mid', url: 'https://stripe.com/jobs', missing: ['React', 'JavaScript Advanced', 'State Management'], transferable: ['CSS', 'Design Systems', 'Prototyping', 'User Research'] },
    ],
  },
  generic: {
    direct: [
      { logo: 'VC', color: '#000000', name: 'Vercel', role: 'Software Engineer', loc: 'Remote', work: 'remote', visa: true, salary: '$160-220k', score: 85, level: 'mid', url: 'https://vercel.com/careers' },
      { logo: 'SB', color: '#3ECF8E', name: 'Supabase', role: 'Engineer', loc: 'Remote', work: 'remote', visa: true, salary: '$140-190k', score: 80, level: 'mid', url: 'https://supabase.com/careers' },
      { logo: 'FL', color: '#7B3FF2', name: 'Fly.io', role: 'Engineer', loc: 'Remote', work: 'remote', visa: true, salary: '$150-200k', score: 78, level: 'mid', url: 'https://fly.io/about' },
    ],
    stretch: [
      { logo: 'ST', color: '#635BFF', name: 'Stripe', role: 'QA Engineer', loc: 'South San Francisco', work: 'hybrid', visa: false, salary: '$150-200k', score: 72, level: 'mid', url: 'https://stripe.com/jobs', missing: ['Test Frameworks', 'Automation'], transferable: ['JavaScript', 'Git', 'CI/CD'] },
    ],
  },
}

export function getCategory(role: string): string {
  const r = (role || '').toLowerCase()
  if (r.includes('frontend') || r.includes('front-end') || r.includes('ui ')) return 'frontend'
  if (r.includes('backend') || r.includes('full-stack') || r.includes('fullstack') || r.includes('database') || r.includes('platform')) return 'backend'
  if (r.includes('design') || r.includes('ux')) return 'design'
  return 'generic'
}

export function createResumeFromUpload(filename: string): Resume {
  const cleanName = filename.replace(/\.(pdf|docx|txt|md)$/i, '').replace(/_/g, ' ').replace(/-/g, ' ')
  const role = cleanName.length > 5 ? cleanName.substring(0, 40) : 'Software Engineer'
  const category = getCategory(role)
  const db = COMPANY_DB[category] || COMPANY_DB.generic
  const skills =
    category === 'frontend' ? ['React', 'TypeScript', 'CSS', 'JavaScript', 'HTML5'] :
    category === 'backend' ? ['Node.js', 'PostgreSQL', 'TypeScript', 'Docker', 'API Design'] :
    category === 'design' ? ['Figma', 'UI Design', 'Prototyping', 'Design Systems', 'Typography'] :
    ['JavaScript', 'Communication', 'Git', 'Problem Solving']

  return {
    id: Date.now(),
    name: role,
    persona: 'Alex Rivera',
    score: db.direct[0].score,
    updated: 'just now',
    skills,
    companies: db.direct,
    stretch: db.stretch,
  }
}

export function createResumeFromWizard(data: {
  role: string
  name: string
  email: string
  location: string
  summary: string
  company: string
  companyRole: string
  dates: string
  bullets: string[]
  skills: string[]
}): Resume {
  const category = getCategory(data.role)
  const db = COMPANY_DB[category] || COMPANY_DB.generic
  return {
    id: Date.now(),
    name: data.role,
    persona: data.name || 'Your Name',
    email: data.email,
    location: data.location,
    summary: data.summary || `Professional with experience in ${data.skills.slice(0, 3).join(', ')}.`,
    score: db.direct[0].score,
    updated: 'just now',
    skills: data.skills.length > 0 ? data.skills : ['JavaScript', 'Communication', 'Problem Solving'],
    experience: [{
      company: data.company || 'Your Company',
      role: data.companyRole || data.role,
      dates: data.dates || '2020 - Present',
      bullets: data.bullets.length > 0 ? data.bullets : ['Describe your achievements.'],
    }],
    companies: db.direct,
    stretch: db.stretch,
  }
}
