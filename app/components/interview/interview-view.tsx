'use client'

import { useState } from 'react'
import { InterviewSetup } from './interview-setup'
import { InterviewSession } from './interview-session'
import { InterviewSummary } from './interview-summary'
import type { InterviewConfig, InterviewExchange } from '~/types/interview'
import { useAppStore } from '~/lib/store'

export function InterviewView() {
  const { resumes, activeResumeId } = useAppStore()
  const [phase, setPhase] = useState<'setup' | 'session' | 'summary'>('setup')
  const [config, setConfig] = useState<InterviewConfig | null>(null)
  const [exchanges, setExchanges] = useState<InterviewExchange[]>([])

  const currentResume = resumes.find((r) => r.id === (config?.resumeId || activeResumeId)) || resumes[0] || null

  const handleStart = (selectedConfig: InterviewConfig) => {
    setConfig(selectedConfig)
    setExchanges([])
    setPhase('session')
  }

  const handleEndSession = (finalExchanges: InterviewExchange[]) => {
    setExchanges(finalExchanges)
    setPhase('summary')
  }

  const handleRestart = () => {
    setPhase('setup')
    setConfig(null)
    setExchanges([])
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background">
      {phase === 'setup' && <InterviewSetup onStart={handleStart} />}
      {phase === 'session' && config && (
        <InterviewSession config={config} resume={currentResume} onEnd={handleEndSession} />
      )}
      {phase === 'summary' && (
        <InterviewSummary exchanges={exchanges} onRestart={handleRestart} />
      )}
    </div>
  )
}
