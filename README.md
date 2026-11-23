# MeDRA annotation page

A small static page for labelling the MeDRA evaluation traces: pick your file, click the dot before a
sentence to start a step there and choose its type, fill in the key concepts and topics, tick
"Finished", then **Save .md**. The browser downloads the annotation file with its repo name
(e.g. `en-mat-dice.md`); send it to Joe, who copies it into `eval/annotations/` and runs
`python -m eval.annotations --check`.

Work in progress is kept in the browser (localStorage) until you press "Reset to the original file".

- `export.py` builds `data.js` from the medra repo (traces, MeDRA's sentence spans, the pushed
  annotation files): `C:/Users/joeba/medra/.venv/Scripts/python export.py --medra C:/Users/joeba/medra`
- `core.js` writes the file in exactly the format the checker expects; `node test_roundtrip.mjs DIR`
  rewrites every file unchanged into DIR to check that.
- No build step: serve the folder (`python -m http.server`) or publish it with GitHub Pages.
