export interface SmartOverviewResult {
  verdict: 'strong_fit' | 'good_fit' | 'stretch' | 'weak_fit' | 'skip'
  verdictLabel: string
  headline: string
  matchAnalysis: {
    strengths: string[]
    gaps: string[]
    insight: string
  }
  roleSummary: string[]
  salaryCheck?: {
    listed?: string
    estimate?: string
    assessment: 'above_market' | 'fair' | 'below_market' | 'unknown'
    note?: string
  }
  commuteEstimate?: {
    summary: string
    monthlyCostEstimate?: string
    note?: string
  }
  companySnapshot: {
    description: string
    known: boolean
    note?: string
  }
  coachTip: string
  recommendedActions: {
    action: 'tailor_resume' | 'cover_letter' | 'practice_interview' | 'apply' | 'skip'
    priority: 'high' | 'medium' | 'low'
    reason: string
  }[]
}
