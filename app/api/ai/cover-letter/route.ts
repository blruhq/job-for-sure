import { NextRequest, NextResponse } from 'next/server'
import { generateTextWithFailover } from '~/lib/ai-providers'
import { getSessionUser } from '~/lib/auth-helpers'
import { checkRateLimit } from '~/lib/ratelimit'
import { db } from '~/lib/db'
import { coverLetters } from '~/lib/schema'
import { captureServerEvent } from '~/lib/posthog-server'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const limited = await checkRateLimit(user.id)
    if (limited) return limited

    const { resume, jdText, company, role, focus, language } = await req.json()
    const isThai = language === 'th'

    let prompt = `Resume:\n${JSON.stringify(resume)}\n\n`
    
    if (company && role) {
      prompt += `Target Role: ${role} at ${company}.\n`
      if (focus) {
        prompt += `Focus/Highlight Areas: ${focus}\n`
      }
      if (jdText) {
        prompt += `Job Description Context:\n${jdText}`
      }
    } else if (jdText) {
      prompt += `Job Description:\n${jdText}`
    } else {
      const topCompany = resume.companies?.[0]
      if (topCompany) {
        prompt += `Target Role: ${topCompany.role} at ${topCompany.name}. Write a tailored cover letter for this company and position.`
      } else {
        prompt += `Target Role/Persona: ${resume.persona}. Write a professional, general cover letter for roles matching this profile.`
      }
    }

    const isThaiSystemPrompt = `คุณคือผู้เชี่ยวชาญด้านการเขียนจดหมายแนะนำตัวและโค้ชด้านอาชีพ
เขียนจดหมายแนะนำตัวแบบทางการ ความยาว 3-4 ย่อหน้า (ประมาณ 300-400 คำ) ที่ปรับแต่งตามเรซูเม่และตำแหน่งงานที่กำหนด

กฎ:
- เขียนด้วยภาษาไทยทางการ สุภาพ เป็นมืออาชีพ และมีความมั่นใจ
- หลีกเลี่ยงการใช้ภาษาซ้ำซากหรือคลิเช่
- เน้นประสบการณ์และทักษะจากเรซูเม่ที่ตรงกับตำแหน่งงาน
- รูปแบบจดหมายทางการ:
  - คำขึ้นต้น: "เรียน ผู้จัดการฝ่ายบุคคล หรือผู้มีส่วนเกี่ยวข้อง,"
  - ย่อหน้าเปิด: แนะนำตัวและระบุตำแหน่งที่สมัคร
  - ย่อหน้าเนื้อหา: แสดงคุณค่าและความเหมาะสม อ้างอิงความสำเร็จ 1-2 ข้อจากประสบการณ์
  - ย่อหน้าปิด: กล่าวถึงความตั้งใจและขอโอกาสในการสัมภาษณ์
  - คำลงท้าย: "ขอแสดงความนับถือ" ตามด้วยชื่อผู้สมัคร (${resume.name})
- แปลข้อมูลนำเข้าที่เป็นภาษาอื่น (เช่น อังกฤษ) เป็นภาษาไทยก่อนนำไปใช้ในจดหมาย
- ส่งออกเฉพาะข้อความจดหมายเท่านั้น ไม่มีคำอธิบายเพิ่มเติมหรือ markdown`

    const enSystemPrompt = `You are an expert career coach and professional writer.
You write persuasive, polished, and natural-sounding cover letters.
Write a 3-4 paragraph, 300-400 word cover letter tailored to the provided resume and target job description/role.

Rules:
- Write in a professional, engaging, and confident tone.
- Do NOT use generic placeholder cliches. Keep it punchy and outcome-oriented.
- Highlight specific experience and skills from the resume that match the job description/role.
- Use standard business letter formatting:
  - Salutation (e.g., "Dear Hiring Manager," or "Dear Hiring Team,")
  - Opening paragraph (hooking the reader, stating the role applied for)
  - Body paragraphs (demonstrating value, explaining fit, citing 1-2 major achievements from experience)
  - Closing paragraph (call to action, express enthusiasm, thank them for consideration)
  - Sign-off (e.g., "Sincerely,") followed by the candidate's name (which is ${resume.name}).
- Translate any input fields provided in a different language (like Thai) into English before incorporating them into the generated cover letter.
- Return ONLY the cover letter text itself. No extra markdown explanation, conversational intro/outro, or styling.`

    const text = await generateTextWithFailover({
      system: isThai ? isThaiSystemPrompt : enSystemPrompt,
      prompt,
      temperature: 0.7,
      maxOutputTokens: 1024,
    })

    await captureServerEvent(user.id, 'cover_letter_created', { company, role, language })

    // Save to cover_letters table
    const letterId = crypto.randomUUID()
    try {
      await db.insert(coverLetters).values({
        id: letterId,
        userId: user.id,
        resumeId: null,
        company: company || null,
        role: role || null,
        content: text.trim(),
        jdText: jdText || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    } catch (err) {
      console.error('[cover-letter] Failed to save to DB:', err)
    }

    return NextResponse.json({ letter: text.trim(), id: letterId })
  } catch (error) {
    console.error('[cover-letter] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cover letter generation failed' },
      { status: 500 },
    )
  }
}
