// Example custom template for Resume Smith.
// Upload this file with the "Upload Template" button.

#let ink = rgb("183153")
#let muted = rgb("52606d")
#let accent = rgb("0f766e")
#let accent-light = rgb("e6fffb")
#let rule = rgb("99f6e4")

#let bold(body) = text(weight: 700, body)

#let resume(
  paper: "us-letter",
  top-margin: 0.45in,
  bottom-margin: 0.45in,
  left-margin: 0.5in,
  right-margin: 0.5in,
  font-size: 9pt,
  personal-info-font-size: 8.5pt,
  author-name: "",
  author-position: left,
  personal-info-position: left,
  phone: "",
  location: "",
  email: "",
  website: "",
  linkedin-user-id: "",
  github-username: "",
  body,
) = {
  set document(
    title: "Resume | " + author-name,
    author: author-name,
    keywords: "cv, resume",
    date: datetime.today(),
  )
  set page(
    paper: paper,
    margin: (
      top: top-margin,
      bottom: bottom-margin,
      left: left-margin,
      right: right-margin,
    ),
  )
  set text(size: font-size, lang: "en", ligatures: false, fill: ink)
  set par(leading: 0.62em)

  show heading.where(level: 1): it => {
    v(0.35em)
    block(width: 100%, inset: (x: 0.45em, y: 0.18em), fill: accent-light, radius: 2pt)[
      #text(size: 11pt, weight: 700, fill: accent)[#upper(it.body)]
    ]
    v(-0.2em)
  }

  align(author-position)[
    #text(size: 25pt, weight: 800, fill: accent)[#upper(author-name)]
    #v(0.2em)
    #line(length: 100%, stroke: 1.2pt + rule)
    #v(0.35em)
    #set text(size: personal-info-font-size, fill: muted)
    #{
      let linked(value, target) = if value != "" {
        link(target)[#value]
      }
      let items = (
        linked(email, "mailto:" + email),
        linked(website, "https://" + website),
        linked(linkedin-user-id, "https://linkedin.com/in/" + linkedin-user-id),
        linked(github-username, "https://github.com/" + github-username),
        if phone != "" { phone },
      )
      items.filter(item => item != none).join([ #h(0.45em) | #h(0.45em) ])
    }
  ]
  v(0.2em)
  body
}

#let period-worked(start-date, end-date) = {
  let display-date(value) = if type(value) == str { value } else { value.display("[month repr:short] [year]") }
  let start = display-date(start-date)
  let finish = display-date(end-date)
  if start == "" { finish } else if finish == "" { start } else { [#start - #finish] }
}

#let work-heading(title, company, location, start-date, end-date, body) = {
  grid(
    columns: (1fr, auto),
    column-gutter: 1em,
    [#text(weight: 700, fill: accent)[#title] #if company != "" { [at #company] }],
    text(weight: 600)[#period-worked(start-date, end-date)],
    text(fill: muted)[#location],
    [],
  )
  if body != [] {
    v(-0.25em)
    set list(indent: 1em, spacing: 0.25em)
    body
  }
}

#let project-heading(name, stack: "", project-url: "", award: "", body) = {
  let project-name = if project-url != "" {
    link(project-url)[#text(weight: 700, fill: accent)[#name]]
  } else {
    text(weight: 700, fill: accent)[#name]
  }
  [#project-name]
  if stack != "" { text(fill: muted)[ #h(0.35em) | #h(0.35em) #stack] }
  if award != "" { text(fill: muted)[ #h(0.35em) - #award] }
  if body != [] {
    v(-0.25em)
    set list(indent: 1em, spacing: 0.25em)
    body
  }
}

#let education-heading(institution, location, degree, major, start-date, end-date, body) = {
  grid(
    columns: (1fr, auto),
    column-gutter: 1em,
    text(weight: 700, fill: accent)[#institution],
    text(weight: 600)[#period-worked(start-date, end-date)],
    text(fill: muted)[#degree#if degree != "" and major != "" { [, ] }#major],
    text(fill: muted)[#location],
  )
  if body != [] {
    v(-0.25em)
    set list(indent: 1em, spacing: 0.25em)
    body
  }
}

#let achievement-heading(title, date, body) = {
  grid(
    columns: (1fr, auto),
    text(weight: 700, fill: accent)[#title],
    text(weight: 600, fill: muted)[#date],
  )
  if body != [] { body }
}

#let skills(body) = {
  set list(marker: [], indent: 0em, body-indent: 0em, spacing: 0.3em)
  body
}

// ========== RESUME CONTENT ==========
// Resume Smith replaces everything after the marker above.
