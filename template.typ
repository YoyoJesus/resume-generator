#import "@preview/cades:0.3.1": qr-code

#let head-color = rgb("#22227f")
#let text-color = rgb("#1b1b1b")   
#let acct-color = rgb("#22328A")
#let link-color = rgb("#1d4ed8")
#let font-size =  8.7pt
#let personal-info-addition = 2.5pt
#let heading-addition = 8.1pt
#let title-addition = 12.0pt

#let bold(body) = {
  text(weight: 700)[#body]
}

#let link2(target, body ) = {
  link(target, text(fill: link-color)[#body])
}

#let resume(
  paper: "a4",
  top-margin: 0.15in,
  bottom-margin: 0.15in,
  left-margin: 0.15in,
  right-margin: 0.15in,
  font: "Libertinus Serif",
  font-size: font-size,
  personal-info-font-size: (font-size+personal-info-addition),
  author-name: "",
  author-position: center,
  personal-info-position: center,
  phone: "",
  location: "",
  email: "",
  website: "",
  linkedin-user-id: "",
  github-username: "",

  body
) = {
  set document(
    title: "Resume | " + author-name,
    author: author-name,
    keywords: "cv, resume",
    date: datetime.today()
  )

  set page(
    paper: paper,
    margin: (
      top: top-margin, bottom: bottom-margin,
      left: left-margin, right: right-margin
    ),
  )

  set text(
    font: font, size: font-size, lang: "en", ligatures: false, fill: text-color
  )

  show heading.where(level: 1): it => block(width: 100%)[
    #set text(font-size + heading-addition, weight: "regular", fill: acct-color)
    #smallcaps(it.body)
    #v(-1.0em)
    #line(length: 100%, stroke: stroke(thickness: 0.4pt, paint: acct-color))
    #v(-0.2em)
  ]

  let contact_item(value, link-type: "", prefix: "") = {
    if value != "" {
      if link-type != "" {
        underline(offset: 0.3em)[#link2(link-type + value)[#text(prefix + value)]]
      } else {
        value
      }
    }
  }

  align(author-position, [
    #grid(
      columns: (1fr, auto),
      gutter: 0.6em,
    )[
      #grid(
        rows: 2,
      )[
        #align(center, [
          #grid(columns: 1, 
          column-gutter: 20pt,
          align: center,

          upper(text(font-size + title-addition, weight: "bold", fill: head-color)[#author-name]),
        )[
          #v(-0.2em)
        ]
      ])
      #v(0.4em)

      #align(center, text(personal-info-font-size)[
          #{
            let sepSpace = 0.2em
            let items = (
              contact_item(location),
              contact_item(email, link-type: "mailto:"),
              contact_item(website, link-type: "https://"),
              contact_item(
                linkedin-user-id,
                link-type: "https://linkedin.com/in/",
                prefix: "linkedin.com/in/",
              ),
              contact_item(
                github-username,
                link-type: "https://github.com/",
                prefix: "github.com/",
              ),
              contact_item(phone),
            )
            items.filter(x => x != none).join([
              #show "|": sep => {
                h(sepSpace)
                [|]
                h(sepSpace)
              }
              |
            ])
          }
        ])
      ]
    ]
  ])
  v(-1em)
  // DONT REMOVE THIS, I KNOW IT'S SMALL
  body
}
#let generic_1x2(r1c1, r1c2) = {
  grid(
    columns: (1fr, 1fr),
    align(left)[#r1c1],
    align(right)[#r1c2]
  )
}

#let generic_2x2(cols, r1c1, r1c2, r2c1, r2c2) = {
  assert.eq(type(cols), array)

  grid(
    columns: cols,
    align(left)[#r1c1 \ #r2c1],
    align(right)[#r1c2 \ #r2c2]
  )
}

#let custom-title(title, spacing-between: -0.8em, body) = {
  text([= #title])
  body
  v(spacing-between)
}

#let skills(body) = {
  if body != [] {
    set par(leading: 0.6em)
    set list(
      body-indent: 0.1em,
      indent: 0em,
      spacing: 0.7em,
      marker: []
    )
    body
  }
}

#let period_worked(start-date, end-date) = {
  assert.eq(type(start-date), datetime)
  assert(type(end-date) == datetime or type(end-date) == str)

  if type(end-date) == str and end-date == "Present" {
    end-date = datetime.today()
  }

  return [
    #start-date.display("[month repr:short] [year]") -
    #if (
      (end-date.month() == datetime.today().month()) and 
        (end-date.year() == datetime.today().year())
      ) [
        Present
      ] else [
        #end-date.display("[month repr:short] [year]")
      ]
    ]
  }

  #let work-heading(title, company, location, start-date, end-date, body) = {
  assert.eq(type(start-date), datetime)
  assert(type(end-date) == datetime or type(end-date) == str)

  generic_2x2(
    (1fr, 1fr),
    [#bold(title)], [#bold(period_worked(start-date, end-date))], 
    [#company], location
  )
  v(-0.2em)
  if body != [] {
    v(-0.5em)
    set par(leading: 0.6em)
    set list(indent: 1.0em)
    body
  }
}

#let project-heading(name, stack: "", project-url: "", body) = {
  if project-url.len() != 0 { underline(offset: .3em, link2(project-url)[#bold(name)]) } else {
    [#bold(name)] 
  }
  if stack != "" {
    [
      #show "|": sep => { h(0.3em); [|]; h(0.3em) }
      |#bold(stack)
    ]
  }
  v(-0.2em)
  if body != [] {
    v(-0.4em)
    set par(leading: 0.6em)
    set list(indent: 1.0em)
    body
  }
}

#let education-heading(institution, location, degree, major, start-date, end-date, body) = {
  assert.eq(type(start-date), datetime)
  assert(type(end-date) == datetime or type(end-date) == str)

  let degree-line = if degree != "" and major != "" {
    [#degree, #major]
  } else if degree != "" {
    [#degree]
  } else if major != "" {
    [#major]
  } else {
    []
  }
  generic_2x2(
    (70%, 30%),
    [#bold(institution)], [#bold(location)],
    degree-line, period_worked(start-date, end-date)
  )
  v(-0.2em)
  if body != [] {
    v(-0.4em)
    set par(leading: 0.6em)
    set list(indent: 0.5em)
    body
  }
}