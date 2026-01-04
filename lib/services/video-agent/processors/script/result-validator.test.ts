import { validateAnalysisResult } from './result-validator'
import type { ScriptAnalysisResult } from '@/lib/types/video-agent'

function buildAnalysis(overrides: Partial<ScriptAnalysisResult> = {}): ScriptAnalysisResult {
  const base: ScriptAnalysisResult = {
    duration: 10,
    shot_count: 2,
    story_style: 'auto',
    characters: [],
    shots: [
      {
        shot_number: 1,
        time_range: '0-5s',
        description: 'A cat sits on a windowsill.',
        camera_angle: 'Medium shot, eye level',
        character_action: 'Looking outside',
        characters: [],
        mood: 'Calm',
        duration_seconds: 5
      },
      {
        shot_number: 2,
        time_range: '5-10s',
        description: 'A dog runs across the yard.',
        camera_angle: 'Wide shot, eye level',
        character_action: 'Running fast',
        characters: [],
        mood: 'Energetic',
        duration_seconds: 5
      }
    ]
  }

  return { ...base, ...overrides }
}

describe('validateAnalysisResult', () => {
  it('flags shot_count mismatch with shots.length', () => {
    const analysis = buildAnalysis({ shot_count: 3 })
    const result = validateAnalysisResult(analysis)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('shot_count mismatch'))).toBe(true)
  })

  it('flags duplicate shot descriptions', () => {
    const analysis = buildAnalysis({
      shots: [
        {
          shot_number: 1,
          time_range: '0-5s',
          description: 'A cat sits on a windowsill.',
          camera_angle: 'Medium shot, eye level',
          character_action: 'Looking outside',
          characters: [],
          mood: 'Calm',
          duration_seconds: 5
        },
        {
          shot_number: 2,
          time_range: '5-10s',
          description: '  A  cat  sits on a windowsill.  ',
          camera_angle: 'Wide shot, eye level',
          character_action: 'Staying still',
          characters: [],
          mood: 'Calm',
          duration_seconds: 5
        }
      ]
    })

    const result = validateAnalysisResult(analysis)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('Duplicate shot descriptions detected'))).toBe(true)
  })
})
