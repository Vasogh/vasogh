"""Only explicit public assets are deployed, never scripts/state/secrets."""
import json
import os
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / '_site'
if DEST.exists():
    shutil.rmtree(DEST)
DEST.mkdir()
for name in ('index.html', 'style.css', 'feeds.js', 'season.js', 'robots.txt', 'sitemap.xml', 'CNAME', '.nojekyll'):
    source = ROOT / name
    if source.exists():
        shutil.copy2(source, DEST / name)
# Verification files are public and may be added later by the site owner.
for pattern in ('yandex_*.html', 'google*.html'):
    for source in ROOT.glob(pattern):
        if source.is_file():
            shutil.copy2(source, DEST / source.name)
shutil.copytree(ROOT / 'assets', DEST / 'assets')
(DEST / 'data').mkdir()
shutil.copy2(ROOT / 'data/telegram.json', DEST / 'data/telegram.json')
config = json.loads((ROOT / 'data/config.json').read_text())
raw_id = os.environ.get('VK_GROUP_ID', '').strip()
if raw_id:
    if not raw_id.isdigit() or int(raw_id) <= 0:
        raise SystemExit('VK_GROUP_ID must be a positive numeric community ID, not a URL.')
    config['vk_group_id'] = int(raw_id)
if not config.get('vk_group_id'):
    print('::warning::VK_GROUP_ID is not configured. The VK channel link will be displayed instead of the wall.')
(DEST / 'data/config.json').write_text(json.dumps(config) + '\n')
print('Public site prepared in _site/')
