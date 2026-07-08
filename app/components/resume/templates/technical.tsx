import { Text, View, StyleSheet } from '@react-pdf/renderer'
import type { ResumeData } from '~/types/resume'

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row' as const,
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  name: {
    fontFamily: 'Instrument Serif',
    fontSize: 26,
    fontWeight: 400,
    letterSpacing: -0.3,
  },
  title: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end' as const,
    fontSize: 9,
    color: '#6B7280',
    lineHeight: 1.6,
  },
  section: {
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    color: '#6B7280',
    marginTop: 12,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
    paddingBottom: 3,
  },
  grid: {
    flexDirection: 'row' as const,
    gap: 20,
  },
  leftCol: {
    flex: 2,
  },
  rightCol: {
    flex: 1,
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
    marginLeft: 12,
    marginBottom: 1.5,
    lineHeight: 1.4,
  },
  skillCategory: {
    fontSize: 9,
    fontWeight: 600,
    marginTop: 6,
    color: '#1D1D1F',
  },
  skillItems: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 1,
    marginBottom: 4,
  },
})

export function TechnicalTemplate({ resume }: { resume: ResumeData }) {
  return (
    <View>
      {/* Header with contact side */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.name}>{resume.name}</Text>
          <Text style={styles.title}>{resume.summary}</Text>
        </View>
        <View style={styles.headerRight}>
          <Text>{resume.email}</Text>
          <Text>{resume.phone}</Text>
          <Text>{resume.location}</Text>
          {resume.projects.find((p) => p.link) && (
            <Text>{resume.projects.find((p) => p.link)?.link}</Text>
          )}
        </View>
      </View>

      <View style={styles.grid}>
        {/* Left column: Experience + Education */}
        <View style={styles.leftCol}>
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
                    <Text key={j} style={styles.bullet}>– {b}</Text>
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
        </View>

        {/* Right column: Skills + Projects */}
        <View style={styles.rightCol}>
          {resume.skills.length > 0 && (
            <>
              <Text style={styles.section}>Skills</Text>
              {/* Group skills by proficiency or just list */}
              {['expert', 'advanced'].filter((l) =>
                resume.skills.some((s) => s.level === l)
              ).map((level) => (
                <View key={level}>
                  <Text style={styles.skillCategory}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </Text>
                  <Text style={styles.skillItems}>
                    {resume.skills
                      .filter((s) => s.level === level)
                      .map((s) => s.name)
                      .join(', ')}
                  </Text>
                </View>
              ))}
            </>
          )}

          {resume.projects.length > 0 && (
            <>
              <Text style={styles.section}>Projects</Text>
              {resume.projects.map((proj, i) => (
                <View key={i}>
                  <Text style={styles.role}>{proj.name}</Text>
                  <Text style={styles.skillItems}>{proj.description}</Text>
                  <Text style={{ ...styles.skillItems, fontSize: 8 }}>
                    {proj.techStack.join(', ')}
                  </Text>
                </View>
              ))}
            </>
          )}
        </View>
      </View>
    </View>
  )
}
