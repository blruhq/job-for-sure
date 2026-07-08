import { Text, View, StyleSheet } from '@react-pdf/renderer'
import type { ResumeData } from '~/types/resume'

const styles = StyleSheet.create({
  name: {
    fontFamily: 'Instrument Serif',
    fontSize: 28,
    fontWeight: 400,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  contact: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 16,
  },
  section: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    color: '#6B7280',
    marginTop: 14,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
    paddingBottom: 4,
  },
  role: {
    fontSize: 11,
    fontWeight: 600,
    marginTop: 6,
  },
  company: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 2,
  },
  bullet: {
    fontSize: 10,
    marginLeft: 14,
    marginBottom: 2,
    lineHeight: 1.45,
  },
  skillRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 4,
    marginTop: 4,
  },
  skill: {
    fontSize: 9,
    backgroundColor: '#F3F4F6',
    padding: '2 6',
    borderRadius: 2,
  },
})

export function ModernTemplate({ resume }: { resume: ResumeData }) {
  return (
    <View>
      <Text style={styles.name}>{resume.name}</Text>
      <Text style={styles.contact}>
        {resume.email} · {resume.phone} · {resume.location}
      </Text>

      {resume.summary && (
        <>
          <Text style={styles.section}>Summary</Text>
          <Text style={styles.bullet}>{resume.summary}</Text>
        </>
      )}

      {resume.experience.length > 0 && (
        <>
          <Text style={styles.section}>Experience</Text>
          {resume.experience.map((exp, i) => (
            <View key={i}>
              <Text style={styles.role}>{exp.role}</Text>
              <Text style={styles.company}>
                {exp.company} · {exp.startDate} – {exp.endDate}
              </Text>
              {exp.bullets.map((b, j) => (
                <Text key={j} style={styles.bullet}>• {b}</Text>
              ))}
            </View>
          ))}
        </>
      )}

      {resume.education.length > 0 && (
        <>
          <Text style={styles.section}>Education</Text>
          {resume.education.map((edu, i) => (
            <View key={i}>
              <Text style={styles.role}>
                {edu.degree} in {edu.field}
              </Text>
              <Text style={styles.company}>
                {edu.institution} · {edu.startDate} – {edu.endDate}
                {edu.gpa ? ` · GPA: ${edu.gpa}` : ''}
              </Text>
            </View>
          ))}
        </>
      )}

      {resume.skills.length > 0 && (
        <>
          <Text style={styles.section}>Skills</Text>
          <View style={styles.skillRow}>
            {resume.skills.map((skill, i) => (
              <Text key={i} style={styles.skill}>
                {skill.name}
              </Text>
            ))}
          </View>
        </>
      )}

      {resume.projects.length > 0 && (
        <>
          <Text style={styles.section}>Projects</Text>
          {resume.projects.map((proj, i) => (
            <View key={i}>
              <Text style={styles.role}>{proj.name}</Text>
              <Text style={styles.bullet}>{proj.description}</Text>
              <Text style={{ ...styles.company, marginLeft: 14 }}>
                {proj.techStack.join(', ')}
              </Text>
            </View>
          ))}
        </>
      )}
    </View>
  )
}
