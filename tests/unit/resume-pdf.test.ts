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

  it('renders multiple pages when content overflows single page', async () => {
    const longResume: Resume = {
      id: 'test-long',
      name: 'Long Resume',
      role: 'Senior Software Engineer',
      persona: 'Jane Smith',
      email: 'jane@example.com',
      phone: '123-456-7890',
      location: 'San Francisco, CA',
      github: 'github.com/janesmith',
      score: 95,
      updated: 'now',
      summary:
        'Experienced software engineer with 10+ years building scalable web applications. '.repeat(3).trim(),
      skills: Array.from({ length: 25 }, (_, i) => `Skill${i + 1}`),
      experience: Array.from({ length: 4 }, (_, i) => ({
        company: `Company ${i + 1}`,
        role: `Senior Engineer ${i + 1}`,
        dates: `202${i} - 202${i + 1}`,
        bullets: [
          'Led a team of 5 engineers to build a distributed system processing 1M requests/day.',
          'Reduced infrastructure costs by 40% through optimization and migration to serverless.',
          'Designed and implemented a real-time analytics dashboard used by 200+ internal users.',
          'Mentored 3 junior engineers and established best practices for code reviews.',
        ],
      })),
      education: [
        { institution: 'MIT', degree: 'M.Sc.', field: 'Computer Science', dates: '2012 - 2014' },
        { institution: 'Stanford', degree: 'B.Sc.', field: 'Computer Science', dates: '2008 - 2012' },
      ],
      projects: Array.from({ length: 3 }, (_, i) => ({
        name: `Project ${i + 1}`,
        description:
          'A comprehensive full-stack application built with React, Node.js, and PostgreSQL. '.repeat(2).trim(),
        techStack: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker', 'AWS'],
        link: 'https://github.com',
      })),
      certifications: [
        { name: 'AWS Solutions Architect', issuer: 'Amazon', date: '2023' },
        { name: 'Kubernetes Administrator', issuer: 'CNCF', date: '2022' },
      ],
      languages: [
        { name: 'English', proficiency: 'Native' },
        { name: 'Spanish', proficiency: 'Fluent' },
      ],
      customSections: [
        {
          id: 'cs_open',
          title: 'Open Source Contributions',
          bullets: [
            'Core contributor to Next.js (50+ merged PRs).',
            'Maintainer of 3 npm packages with 100k+ weekly downloads.',
            'Speaker at ReactConf 2023.',
          ],
        },
        {
          id: 'cs_extra',
          title: 'Extracurriculars',
          bullets: [
            'Hackathon judge at HackMIT 2023.',
            'Volunteer coding instructor at local high school.',
          ],
        },
      ],
      companies: [],
      stretch: [],
    }

    const doc = React.createElement(ResumePDF, { resume: longResume })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stream = await ReactPDF.renderToStream(doc as any)

    const chunks: Uint8Array[] = []
    for await (const chunk of stream as unknown as AsyncIterable<Uint8Array>) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)

    // Count pages by searching for /Type /Page (not /Pages) in the PDF structure
    const text = buffer.toString('latin1')
    const pageMatches = text.match(/\/Type\s*\/Page[^s]/g)
    const pageCount = pageMatches?.length ?? 0

    expect(pageCount).toBeGreaterThanOrEqual(2)
  })
})
