import { Text, View, StyleSheet } from '@react-pdf/renderer'
import type { ResumeData } from '~/types/resume'

const styles = StyleSheet.create({
  name: {
    fontFamily: 'Instrument Serif',
    fontSize: 26,
    fontWeight: 400,
    textAlign: 'center' as const,
    marginBottom: 2,
  },
  contact: {
    fontSize: 9,
    color: '#6B7280',
    textAlign: 'center' as const,
    marginBottom: 16,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#1D1D1F',
    marginBottom: 10,
    marginTop: 10,
  },
  section: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
    marginBottom: 6,
  },
  role: {
    fontSize: 10,
    fontWeight: 600,
    marginTop: 6,
  },
  company: {
    fontSize: 9,
    color: '#6B7280',
    marginBottom: 2,
  },
  bullet: {
    fontSize: 9,
    marginLeft: 14,
    marginBottom: 1.5,
    lineHeight: 1.45,
  },
})

export function ClassicTemplate({ resume }: { resume: ResumeData }) {
  return (
    <View>
      <Text style={styles.name}>{resume.name}</Text>
      <Text style={styles.contact}>
        {resume.email} · {resume.phone} · {resume.location}
      </Text>
      <View style={styles.divider} />

      {resume.experience.length > 0 && (
        <>
          <Text style={styles.section}>Professional Experience</Text>
          {resume.experience.map((exp, i) => (
            <View key={i}>
              <Text style={styles.role}>{exp.role}</Text>
              <Text style={styles.company}>
                {exp.company} | {exp.startDate} – {exp.endDate}
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
          <Text style={{ ...styles.section, marginTop: 10 }}>Education</Text>
          {resume.education.map((edu, i) => (
            <View key={i}>
              <Text style={styles.role}>
                {edu.degree} in {edu.field}
              </Text>
              <Text style={styles.company}>
                {edu.institution} – {edu.startDate} to {edu.endDate}
                {edu.gpa ? ` (GPA: ${edu.gpa})` : ''}
              </Text>
            </View>
          ))}
        </>
      )}

      {resume.skills.length > 0 && (
        <>
          <Text style={{ ...styles.section, marginTop: 10 }}>Skills</Text>
          <Text style={styles.bullet}>
            {resume.skills.map((s) => s.name).join(' | ')}
          </Text>
        </>
      )}
    </View>
  )
}
