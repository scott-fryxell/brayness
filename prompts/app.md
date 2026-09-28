---
description: Start an app from the microdata example and add a type
argument-hint: "[folder] [type]"
---

Start an app in `${1:-app}` from the app example, unless that folder already
exists:

    npx giget gh:scott-fryxell/brayness-examples/app ${1:-app}
    cd ${1:-app} && npm install

Then add `${2:-a type}`.

Four axes carry it:

- **The document is the record.** One `<article>` per item. `itemid` names it;
  `itemprop` fields it. The HTML is at once the structured data, the object
  model, and the styling selector. There is no database and no schema.
- **The itemid is the path.** `/<author>/<type>/<created>`. The vocabulary in
  `src/store.js` lists the types; any type whose id carries a time is in
  `requires_timestamp`.
- **The store is `@realness.online/store`.** `src/store.js` builds it with
  `local()`, which keeps everything in this browser. The store never parses
  microdata and never knows your types beyond the vocabulary.
- **Saving is `new <Class>(id).save(element)`.** Render the article, then save
  the element itself. `load` reads the microdata back out.

To add a type:

1. Add the name to `vocabulary.types`, and to `requires_timestamp` if the id
   carries a time.
2. Give it a class the way `Note` is: `class <Name> extends Local(Storage) {}`.
3. Add a list view and an edit view under `src/views/`, and their routes in
   `src/main.js`, the way notes have them.

Build and publish:

    npm run build
    brayness publish dist

Do not add a database, a schema, or a second store.
