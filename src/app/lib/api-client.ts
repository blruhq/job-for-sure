import type { Resume, PipelineJob, ApplicationBoard, PendingTailor } from '~/types/resume'

export interface CreateApplicationPayload {
  sourceKey: string
  company: string
  jobTitle: string
  jobUrl?: string
  location?: string
  logoUrl?: string
  color?: string
  level?: string
  matchScore?: number
  resumeId?: string
  status: string
}

export interface ReorderApplicationsPayload {
  updates: Array<{
    id: string
    status: string
    position: number
  }>
}

export interface GenerateCoverLetterPayload {
  resume: Resume
  jdText?: string
  company?: string
  role?: string
  focus?: string
  language: 'en' | 'th'
}

export class ApiClient {
  private static async request<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    })
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      throw new Error(errorData.message || errorData.error || `HTTP error! status: ${res.status}`)
    }
    return res.json()
  }

  // Resumes
  static getResumes(): Promise<Array<{ id: string; data: Resume; isBase: boolean }>> {
    return this.request('/api/resumes')
  }

  static createResume(payload: { id: string; data: Resume; isBase?: boolean }): Promise<void> {
    return this.request('/api/resumes', { method: 'POST', body: JSON.stringify(payload) })
  }

  static updateResume(id: string, payload: { data: Partial<Resume>; isBase?: boolean }): Promise<void> {
    return this.request(`/api/resumes/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
  }

  static deleteResume(id: string): Promise<void> {
    return this.request(`/api/resumes/${id}`, { method: 'DELETE' })
  }

  // Applications
  static getApplications(): Promise<any[]> {
    return this.request('/api/applications')
  }

  static createApplication(payload: CreateApplicationPayload): Promise<{ id: string }> {
    return this.request('/api/applications', { method: 'POST', body: JSON.stringify(payload) })
  }

  static deleteApplication(id: string): Promise<void> {
    return this.request(`/api/applications/${id}`, { method: 'DELETE' })
  }

  static clearApplications(): Promise<void> {
    return this.request('/api/applications', { method: 'DELETE' })
  }

  static reorderApplications(payload: ReorderApplicationsPayload): Promise<void> {
    return this.request('/api/applications/reorder', { method: 'POST', body: JSON.stringify(payload) })
  }

  // Cover Letters
  static getCoverLetters(): Promise<any[]> {
    return this.request('/api/cover-letters')
  }

  static deleteCoverLetter(id: string): Promise<void> {
    return this.request(`/api/cover-letters/${id}`, { method: 'DELETE' })
  }

  static generateCoverLetter(payload: GenerateCoverLetterPayload): Promise<{ id: string; letter: string }> {
    return this.request('/api/ai/cover-letter', { method: 'POST', body: JSON.stringify(payload) })
  }

  // Parser
  static parseResume(file: File): Promise<any> {
    const formData = new FormData()
    formData.append('file', file)
    return this.request('/api/parse-resume', {
      method: 'POST',
      body: formData,
    })
  }

  // Admin
  static getSourceHealth(): Promise<any> {
    return this.request('/api/jobs/source-health')
  }
}
