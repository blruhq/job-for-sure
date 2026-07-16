import { describe, it, expect } from 'vitest'
import React from 'react'
import ReactPDF from '@react-pdf/renderer'
import { ResumePDF } from '~/components/resume/resume-pdf'
import type { Resume } from '~/types/resume'

describe('ResumePDF', () => {
  it('renders successfully without crashing', async () => {
    const mockResume: Resume = {
      id: 'test-id',
      name: 'Test Resume',
      role: 'Software Engineer',
      persona: 'John Doe',
      email: 'john@example.com',
      phone: '123-456-7890',
      location: 'Bangkok, Thailand',
      github: 'github.com/johndoe',
      score: 90,
      updated: 'now',
      skills: ['TypeScript', 'React'],
      experience: [
        {
          company: 'Google',
          role: 'Software Engineer',
          dates: '2024 - Present',
          bullets: ['Worked on search.'],
        },
      ],
      education: [
        {
          institution: 'Stamford International University',
          degree: 'B.Sc.',
          field: 'Information Technology',
          dates: '2022 - 2025',
        },
      ],
      projects: [
        {
          name: 'Kalifinder',
          description: 'AI product search widget.',
          techStack: ['React', 'AWS'],
          link: 'https://github.com',
        },
      ],
      certifications: [
        {
          name: 'AWS Certified Solutions Architect',
          issuer: 'Amazon Web Services',
          date: '2024',
        },
      ],
      languages: [
        {
          name: 'English',
          proficiency: 'Fluent',
        },
      ],
      customSections: [
        {
          id: 'cs_test_001',
          title: 'Open Source Contributions',
          bullets: ['Contributed to Next.js.'],
        },
      ],
      companies: [],
      stretch: [],
    }

    const doc = React.createElement(ResumePDF, { resume: mockResume })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stream = await ReactPDF.renderToStream(doc as any)
    
    const chunks: Uint8Array[] = []
    for await (const chunk of stream as unknown as AsyncIterable<Uint8Array>) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)
    
    expect(buffer.length).toBeGreaterThan(0)
  })
})
