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
    <section className="border-t border-border py-20 md:py-28">
      <div className="mx-auto max-w-[1120px] px-6">
        <div className="max-w-xl">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Loved by job seekers.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Real results from people who actually used it.
          </p>
        </div>
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {t.avatar}
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{t.name}</div>
                  <div className="text-[11px] text-muted-foreground">{t.role}</div>
                </div>
              </div>
              <p className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="mt-4 inline-flex self-start rounded-full bg-success/10 px-3 py-1 text-[11px] font-medium text-success">
                {t.result}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
