export interface ResumeData {
  id: string
  userId: string
  name: string
  email: string
  phone: string
  location: string
  summary: string
  education: Education[]
  experience: Experience[]
  skills: Skill[]
  projects: Project[]
  extracurricular: Activity[]
  languages: Language[]
  templateId: string
  createdAt: string
  updatedAt: string
}

export interface Education {
  institution: string
  degree: string
  field: string
  startDate: string
  endDate: string
  gpa?: string
}

export interface Experience {
  company: string
  role: string
  location: string
  startDate: string
  endDate: string
  bullets: string[]
}

export interface Skill {
  name: string
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert'
}

export interface Project {
  name: string
  description: string
  techStack: string[]
  link?: string
}

export interface Activity {
  organization: string
  role: string
  description: string
}

export interface Language {
  name: string
  proficiency: 'basic' | 'conversational' | 'fluent' | 'native'
}

export interface Application {
  id: string
  userId: string
  company: string
  jobTitle: string
  jobUrl: string
  status: 'bookmarked' | 'pending' | 'applied' | 'interview' | 'rejected' | 'offer'
  tailoredResumeId?: string
  notes: string
  appliedAt?: string
  createdAt: string
  updatedAt: string
}

export interface JobDescription {
  title: string
  company: string
  location: string
  description: string
  requirements: string[]
  qualifications: string[]
}
