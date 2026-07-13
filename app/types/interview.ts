export interface InterviewConfig {
  resumeId: string
  targetCompany: string
  targetRole: string
  type: 'behavioral' | 'technical' | 'mixed'
  difficulty: 'entry' | 'mid' | 'senior'
  maxQuestions: number // 0 = unlimited
  // Optional company gap details
  missingSkills?: string[]
  transferableSkills?: string[]
  matchScore?: number
}

export interface InterviewQuestion {
  id: string
  question: string
  category: 'behavioral' | 'technical'
  tags: string[]
}

// During the interview, we only store Q&A — no feedback yet
export interface InterviewQA {
  question: InterviewQuestion
  answer: string
}

// After batch evaluation, feedback is attached
export interface AnswerFeedback {
  score: number // 1-10
  strengths: string[]
  improvements: string[]
  modelAnswer: string
}

// A complete exchange = Q + A + Feedback (used in summary)
export interface InterviewExchange {
  question: InterviewQuestion
  answer: string
  feedback: AnswerFeedback
}

// Batch evaluation response from /api/ai/interview
export interface BatchEvaluationResult {
  evaluations: {
    questionIndex: number
    score: number
    strengths: string[]
    improvements: string[]
    modelAnswer: string
  }[]
  overallScore: number
  summary: string
}
