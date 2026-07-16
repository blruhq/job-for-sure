import type { JobSource } from '~/lib/job-sources/types'

// Full source names for display
export const SOURCE_NAMES: Record<JobSource, string> = {
  greenhouse: 'Greenhouse',
  ashby: 'Ashby',
  remoteok: 'RemoteOK',
  himalayas: 'Himalayas',
  remotive: 'Remotive',
  themuse: 'The Muse',
  arbeitnow: 'Arbeitnow',
  adzuna: 'Adzuna',
  jsearch: 'JSearch',
  jobbkk: 'JobbKK',
  'linkedin-guest': 'LinkedIn',
  linkedin: 'LinkedIn (Apify)',
  indeed: 'Indeed (Apify)',
  jobsdb: 'JobsDB (Apify)',
  'jobsdb-rest': 'JobsDB',
}

// Short source names for compact display (cards, badges)
export const SOURCE_SHORT: Record<JobSource, string> = {
  greenhouse: 'Greenhouse',
  ashby: 'Ashby',
  remoteok: 'RemoteOK',
  himalayas: 'Himalayas',
  remotive: 'Remotive',
  themuse: 'The Muse',
  arbeitnow: 'Arbeitnow',
  adzuna: 'Adzuna',
  jsearch: 'JSearch',
  jobbkk: 'JobbKK',
  'linkedin-guest': 'LinkedIn',
  linkedin: 'LinkedIn',
  indeed: 'Indeed',
  jobsdb: 'JobsDB',
  'jobsdb-rest': 'JobsDB',
}
