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

export interface AnswerFeedback {
  score: number // 1-10
  strengths: string[]
  improvements: string[]
  modelAnswer: string
}

// A complete exchange = Q + A + Feedback
export interface InterviewExchange {
  question: InterviewQuestion
  answer: string
  feedback: AnswerFeedback
}
