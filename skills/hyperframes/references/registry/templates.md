# Contribute Templates

Copy-paste starter templates for each component type. These embed the proven patterns that pass lint and validate.

## Caption Template

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link
      href="https://fonts.googleapis.com/css2?family=Montserrat:wght@800;900&display=swap"
      rel="stylesheet"
    />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      *,
      *::before,
      *::after {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        background: #111;
        overflow: hidden;
      }
      #root-BLOCKNAME {
        position: relative;
        width: 1920px;
        height: 1080px;
        overflow: hidden;
        background: #111;
      }
      .cap-container {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .cg {
        position: absolute;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 32px;
        max-width: 1700px;
        overflow: visible;
        opacity: 0;
        visibility: hidden;
      }
      .cw {
        font-family: "Montserrat", sans-serif;
        font-weight: 900;
        font-size: 128px;
        color: #ffffff;
        text-transform: uppercase;
        line-height: 1;
        display: inline-block;
        -webkit-text-stroke: 3px rgba(0, 0, 0, 0.8);
        paint-order: stroke fill;
        text-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      }
    </style>
  </head>
  <body>
    <div
      id="root-BLOCKNAME"
      data-composition-id="BLOCKNAME"
      data-start="0"
      data-duration="9"
      data-width="1920"
      data-height="1080"
    >
      <div class="cap-container" id="cc-BLOCKNAME"></div>
      <div
        id="drv-BLOCKNAME"
        class="clip"
        data-start="0"
        data-duration="9"
        data-track-index="0"
        style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none"
      ></div>
    </div>
    <script>
      (function () {
        window.__timelines = window.__timelines || {};

        // REPLACE with actual transcript data
        var WORDS = [
          { text: "Welcome", start: 0.3, end: 0.65 },
          { text: "to", start: 0.65, end: 0.8 },
          { text: "the", start: 0.8, end: 0.95 },
          { text: "future", start: 0.95, end: 1.4 },
          // ... add all words
        ];

        var GROUPS = [
          { start: 0.3, end: 1.3, wordStart: 0, wordEnd: 3, text: "Welcome to the future" },
          // ... add all groups
        ];

        var container = document.getElementById("cc-BLOCKNAME");

        GROUPS.forEach(function (g, gi) {
          var groupEl = document.createElement("div");
          groupEl.id = "PREFIX-cg-" + gi;
          groupEl.className = "cg";

          for (var wi = g.wordStart; wi <= g.wordEnd; wi++) {
            var wordEl = document.createElement("span");
            wordEl.id = "PREFIX-cw-" + wi;
            wordEl.className = "cw";
            wordEl.textContent = WORDS[wi].text;
            groupEl.appendChild(wordEl);
          }

          // Pretext overflow prevention
          if (window.__hyperframes && window.__hyperframes.fitTextFontSize) {
            var _fit = window.__hyperframes.fitTextFontSize(g.text.toUpperCase(), {
              fontFamily: "Montserrat",
              fontWeight: 900,
              maxWidth: 1550,
              baseFontSize: 128,
              minFontSize: 48,
            });
            if (_fit.fontSize < 128) {
              for (var _fi = 0; _fi < groupEl.children.length; _fi++) {
                groupEl.children[_fi].style.fontSize = _fit.fontSize + "px";
              }
            }
          }
          container.appendChild(groupEl);
        });

        var tl = gsap.timeline({ paused: true });

        GROUPS.forEach(function (g, gi) {
          var groupEl = document.getElementById("PREFIX-cg-" + gi);

          // SHOW — set opacity to 1 (never use tl.from with opacity:0 here)
          tl.set(groupEl, { opacity: 1, visibility: "visible" }, g.start);

          // ENTRANCE — customize this per style
          tl.from(groupEl, { scale: 1.3, duration: 0.15, ease: "back.out(2)" }, g.start);

          // KARAOKE — highlight each word
          for (var wi = g.wordStart; wi <= g.wordEnd; wi++) {
            var wordEl = document.getElementById("PREFIX-cw-" + wi);
            tl.to(wordEl, { color: "#FFD700", scale: 1.1, duration: 0.06 }, WORDS[wi].start);
            tl.to(wordEl, { color: "#FFFFFF", scale: 1, duration: 0.08 }, WORDS[wi].end);
          }

          // EXIT
          tl.to(groupEl, { opacity: 0, scale: 0.9, duration: 0.1 }, g.end - 0.1);

          // HARD KILL (mandatory)
          tl.set(groupEl, { opacity: 0, visibility: "hidden" }, g.end);
        });

        window.__timelines["BLOCKNAME"] = tl;
      })();
    </script>
  </body>
</html>
```

**Replace checklist:**

- `BLOCKNAME` → your block name (e.g., `cap-swoosh`)
- `PREFIX` → short unique prefix for IDs (e.g., `sw`)
- Font family, weight, size → your style's typography
- Entrance animation → your style's entrance
- Karaoke highlight → your style's active word treatment
- Colors → your style's palette


## registry-item.json Templates

**For blocks:**

```json
{
  "$schema": "https://hyperframes.heygen.com/schema/registry-item.json",
  "name": "BLOCKNAME",
  "type": "hyperframes:block",
  "title": "Human-Readable Title",
  "description": "One sentence: what it does and who uses it",
  "dimensions": { "width": 1920, "height": 1080 },
  "duration": 10,
  "tags": ["category", "subcategory"],
  "files": [
    {
      "path": "BLOCKNAME.html",
      "target": "compositions/BLOCKNAME.html",
      "type": "hyperframes:composition"
    }
  ]
}
```

**For components** (no `dimensions` or `duration`):

```json
{
  "$schema": "https://hyperframes.heygen.com/schema/registry-item.json",
  "name": "COMPONENTNAME",
  "type": "hyperframes:component",
  "title": "Human-Readable Title",
  "description": "One sentence: what it does",
  "tags": ["category"],
  "files": [
    {
      "path": "COMPONENTNAME.html",
      "target": "compositions/components/COMPONENTNAME.html",
      "type": "hyperframes:snippet"
    }
  ]
}
```

Tags by category:

- Captions: `captions`, `viral`, `professional`, `karaoke`, `minimal`
- VFX: `three-js`, `particles`, `shader`, `gpu`
- Transitions: `transition`, `shader`, `wipe`, `dissolve`
- Blocks: `lower-third`, `social`, `title-card`, `data-viz`
- Components: `effect`, `overlay`, `text-treatment`


## Component Template

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      *,
      *::before,
      *::after {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        background: transparent;
        overflow: hidden;
      }
      .COMPNAME-wrap {
        position: absolute;
        inset: 0;
        overflow: hidden;
        pointer-events: none;
      }
    </style>
  </head>
  <body>
    <div class="COMPNAME-wrap">
      <!-- Your reusable effect/overlay here -->
    </div>
    <script>
      (function () {
        // Component snippet — no data-composition-id, no __timelines.
        // The parent composition controls timing.
        // Keep all class names and IDs prefixed with COMPNAME.
      })();
    </script>
  </body>
</html>
```

**Replace checklist:**

- `COMPNAME` → your component name (e.g., `shimmer-sweep`)
- Background should be `transparent` so it overlays cleanly
- No `data-composition-id` or `window.__timelines` — the parent owns timing
