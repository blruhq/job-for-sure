import { describe, it, expect } from 'vitest'
import { extractExperienceYears } from '~/lib/job-sources/types'

describe('extractExperienceYears', () => {
  describe('English patterns', () => {
    it('extracts "3-5 years" from "3-5 years of experience"', () => {
      expect(extractExperienceYears('3-5 years of experience')).toBe('3-5 years')
    })

    it('extracts "2+ years" from "2+ years"', () => {
      expect(extractExperienceYears('2+ years')).toBe('2+ years')
    })

    it('extracts "5+ years" from "minimum 5 years"', () => {
      expect(extractExperienceYears('minimum 5 years')).toBe('5+ years')
    })

    it('returns undefined when no experience text is present', () => {
      expect(extractExperienceYears('no relevant text')).toBeUndefined()
    })

    it('returns undefined for empty string', () => {
      expect(extractExperienceYears('')).toBeUndefined()
    })

    it('returns the first match when multiple matches exist', () => {
      expect(extractExperienceYears('Requires 3-5 years experience and 7+ years total in tech')).toBe('3-5 years')
    })

    it('handles "3 to 5 years" pattern', () => {
      expect(extractExperienceYears('3 to 5 years of experience required')).toBe('3-5 years')
    })

    it('handles "yrs" abbreviation', () => {
      expect(extractExperienceYears('2-4 yrs of experience')).toBe('2-4 years')
    })

    it('handles "5+ yrs" pattern', () => {
      expect(extractExperienceYears('5+ yrs experience')).toBe('5+ years')
    })

    it('handles "at least 3 years of experience"', () => {
      expect(extractExperienceYears('at least 3 years of experience')).toBe('3+ years')
    })

    it('handles en-dash separator "3–5 years"', () => {
      expect(extractExperienceYears('3–5 years experience')).toBe('3-5 years')
    })
  })

  describe('Thai patterns', () => {
    it('extracts range from "ประสบการณ์ 3-5 ปี"', () => {
      expect(extractExperienceYears('ประสบการณ์ 3-5 ปี')).toBe('3-5 years')
    })

    it('extracts "X ปีขึ้นไป" from "ประสบการณ์ 3 ปีขึ้นไป"', () => {
      expect(extractExperienceYears('ประสบการณ์ 3 ปีขึ้นไป')).toBe('3+ years')
    })

    it('extracts "X ปีขึ้นไป" from bare "3 ปีขึ้นไป"', () => {
      expect(extractExperienceYears('3 ปีขึ้นไป')).toBe('3+ years')
    })

    it('extracts from "อายุงานไม่น้อยกว่า 2 ปี"', () => {
      expect(extractExperienceYears('อายุงานไม่น้อยกว่า 2 ปี')).toBe('2+ years')
    })

    it('extracts from "อย่างน้อย 3 ปี"', () => {
      expect(extractExperienceYears('อย่างน้อย 3 ปี')).toBe('3+ years')
    })

    it('extracts from "อายุการทำงาน 4-6 ปี"', () => {
      expect(extractExperienceYears('อายุการทำงาน 4-6 ปี')).toBe('4-6 years')
    })

    it('extracts from a full Thai job description', () => {
      const jd =
        'บริษัทเรากำลังมองหาวิศวกรซอฟต์แวร์ที่มีประสบการณ์ 3-5 ปี\n' +
        'ในการพัฒนาเว็บแอปพลิเคชันด้วย React และ Node.js\n' +
        'เงินเดือน 50,000-80,000 บาท'
      expect(extractExperienceYears(jd)).toBe('3-5 years')
    })

    it('does NOT match age requirement "อายุ 25-35 ปี"', () => {
      expect(extractExperienceYears('อายุ 25-35 ปี')).toBeUndefined()
    })

    it('does NOT match bare "อายุ 3 ปี" (age, not experience)', () => {
      expect(extractExperienceYears('อายุ 3 ปี')).toBeUndefined()
    })

    it('returns undefined for non-experience Thai text', () => {
      expect(extractExperienceYears('เราต้องการ React และ Node.js')).toBeUndefined()
    })
  })

  describe('mixed English-Thai patterns', () => {
    it('prefers English range when both languages present', () => {
      expect(extractExperienceYears('3-5 years experience (ประสบการณ์ 3-5 ปี)')).toBe('3-5 years')
    })
  })
})
