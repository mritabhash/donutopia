import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
bank=json.loads((root/'backend/src/questions.json').read_text())
assert len({q['id'] for q in bank})==len(bank)
assert len({q['text'].casefold() for q in bank})==len(bank)
assert all('answers' not in q and len(q['text'])<200 for q in bank)
legacy=json.loads((root/'backend/src/questions-legacy.json').read_text())
(root/'backend/worker.mjs').write_text('const LEGACY_BANK = '+json.dumps(legacy,ensure_ascii=False,separators=(',',':'))+';\nconst BANK = '+json.dumps(bank,ensure_ascii=False,separators=(',',':'))+';\n'+(root/'backend/src/worker-core.mjs').read_text())
print(f'Built Worker with {len(bank)} open-ended questions')
