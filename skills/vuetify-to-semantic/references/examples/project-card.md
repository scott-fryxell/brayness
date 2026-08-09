# Example: Project Card

Shows v-card -> article with Schema.org microdata, grid replacing v-row/v-col.

## Before

```html
<v-col cols="12" sm="6" xl="3" xxl="2">
  <v-card height="100%" variant="elevated">
    <v-card-title class="text-capitalize text-h5 cursor-pointer" @click="to_project(project)">
      {{ project.name }}
    </v-card-title>
    <v-card-text>
      <v-divider />
      <v-row>
        <v-col cols="12" tag="a" class="cursor-pointer d-flex align-center justify-center"
          @click="to_project(project)">
          <v-img v-if="project.photos?.length" cover :src="project.photos[0]" :alt="project.name" />
          <project-placeholder v-else />
        </v-col>
        <v-col cols="12" sm="6">
          <article v-if="project.sponsors?.length">
            <header><h6 class="text-secondary">Sponsors</h6></header>
            <v-row v-for="sponsor in project.sponsors" :key="sponsor.name">
              <v-col cols="auto">
                <v-img v-if="sponsor.logo" :src="sponsor.logo" width="24px" height="24px" />
                <v-icon v-else size="24" color="primary">mdi-domain</v-icon>
              </v-col>
              <v-col class="text-caption">{{ sponsor.name }}</v-col>
            </v-row>
          </article>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</v-col>
```

## After

```html
<article
  itemscope
  itemtype="https://schema.org/ResearchProject"
  @click="to_project(project)">

  <header>
    <h2 itemprop="name">{{ project.name }}</h2>
  </header>

  <a :href="`/${project.slug}`" itemprop="url" tabindex="-1" aria-hidden="true">
    <img
      v-if="project.photos?.length && !project_photo_failed(project)"
      :src="project.photos[0]"
      :alt="project.name"
      itemprop="image"
      loading="lazy"
      @error="handle_project_photo_error(project)" />
    <project-placeholder v-else />
  </a>

  <section v-if="project.sponsors?.length" aria-label="Sponsors">
    <ul>
      <li
        v-for="sponsor in project.sponsors"
        :key="sponsor.name"
        itemscope
        itemprop="sponsor"
        itemtype="https://schema.org/Organization">
        <img
          v-if="sponsor.logo && !failed_logos.has(sponsor.logo)"
          :src="sponsor.logo"
          :alt="sponsor.name"
          itemprop="logo"
          loading="lazy"
          @error="handle_logo_error(sponsor.name, sponsor.logo)" />
        <svg v-else class="icon" aria-hidden="true">
          <use href="/icons.svg#organization" />
        </svg>
        <span itemprop="name">{{ sponsor.name }}</span>
      </li>
    </ul>
  </section>
</article>
```

## Stylus (scoped to projects view)

```stylus
// Grid replacing v-col cols="12" sm="6" xl="3" xxl="2"
// Applied to the parent container, not the card itself
section.projects {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: base-line;
  padding: base-line;
}

article[itemtype*="ResearchProject"] {
  standard-border(blue);
  standard-shadow();
  display: flex;
  flex-direction: column;
  cursor: pointer;

  &:hover {
    border-color: var(--color-primary);
  }

  & > header {
    padding: calc(base-line * 0.5) base-line;

    h2 {
      margin: 0;
      text-transform: capitalize;
    }
  }

  & > a {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: calc(base-line * 12);
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  & > section[aria-label="Sponsors"] {
    padding: base-line;

    ul {
      list-style: none;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: calc(base-line * 0.5);

      li {
        display: flex;
        align-items: center;
        gap: calc(base-line * 0.5);

        img, svg.icon {
          width: calc(base-line * 1.2);
          height: calc(base-line * 1.2);
          flex-shrink: 0;
          border-radius: 50%;
        }
      }
    }
  }
}
```

## What changed

- `v-col` wrapper removed - grid is on the parent `section.projects`
- `v-card` -> `<article itemtype="ResearchProject">` - entity type drives both semantics and CSS
- `v-card-title` -> `<h2 itemprop="name">` - real heading, not a styled div
- `v-card-text` -> removed - content flows directly in article
- `v-divider` -> removed - visual separation via spacing in Stylus
- `v-row` / `v-col` inside card -> removed - flexbox on section element
- `v-img` -> `<img loading="lazy" itemprop="image">`
- `v-icon mdi-domain` -> `<svg><use href="/icons.svg#organization" /></svg>`
- Sponsor nested as `<li itemprop="sponsor" itemtype="Organization">`
- All `class=` attributes removed - styling entirely via element + attribute selectors
