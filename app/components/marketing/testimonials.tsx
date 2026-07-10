const TESTIMONIALS = [
  {
    name: 'Sarah Chen',
    role: 'Product Designer',
    avatar: 'SC',
    quote:
      "I was applying blind for months. This showed me exactly why I wasn't getting callbacks and how to fix it. Landed 3 interviews in 2 weeks.",
    result: '3 interviews in 2 weeks',
  },
  {
    name: 'Marcus Rivera',
    role: 'Software Engineer',
    avatar: 'MR',
    quote:
      'The AI chat coach told me my resume was missing 4 keywords that every FAANG job wanted. I added them and got a reply the next day.',
    result: 'Reply within 24 hours',
  },
  {
    name: 'Priya Patel',
    role: 'Marketing Manager',
    avatar: 'PP',
    quote:
      "I used to keep 5 different spreadsheets. Now I just save jobs and drag them through stages. It's the only tool I need.",
    result: 'Replaced 5 spreadsheets',
  },
]

export function Testimonials() {
  return (
    <section className="border-t border-border bg-muted/30 py-24 md:py-32">
      <div className="mx-auto max-w-[1120px] px-6">
        <div className="max-w-xl">
          <h2 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
            Loved by job seekers.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            Real results from people who actually used it.
          </p>
        </div>
        <div className="mt-20 grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="flex flex-col rounded-2xl border border-border bg-card p-8 shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {t.avatar}
                </div>
                <div>
                  <div className="text-base font-semibold text-foreground">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
              <p className="mt-6 flex-1 text-base leading-relaxed text-muted-foreground">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="mt-6 inline-flex self-start rounded-full bg-success/10 px-4 py-1.5 text-xs font-medium text-success">
                {t.result}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
