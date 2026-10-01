"""Collect public post IDs from a dedicated channel bot. Standard library only."""
import json
import os
import sys
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

ROOT = Path(__file__).resolve().parents[1]
CHANNEL = 'bahchisarai'
POSTS = ROOT / 'data/telegram.json'
STATE = ROOT / 'data/telegram-state.json'
CONTENT_KEYS = {'text', 'photo', 'video', 'animation', 'audio', 'document',
                'voice', 'video_note', 'sticker', 'poll', 'location', 'venue', 'contact', 'rich_message', 'paid_media'}


def api(token, method, payload=None):
    request = Request('https://api.telegram.org/bot' + token + '/' + method,
                      data=json.dumps(payload or {}).encode(),
                      headers={'Content-Type': 'application/json'})
    try:
        with urlopen(request, timeout=40) as response:
            result = json.load(response)
    except HTTPError as exc:
        # Never log an exception containing the request URL: the URL contains the token.
        raise RuntimeError(f'Telegram HTTP {exc.code}. Check bot secret, permissions and webhook settings.') from None
    except (URLError, TimeoutError, ValueError, OSError):
        raise RuntimeError('Telegram request failed. Existing feed is preserved; retry this workflow.') from None
    if not result.get('ok'):
        raise RuntimeError('Telegram rejected the request. Check bot configuration.')
    return result['result']


def merge_posts(existing, updates, chat_id):
    """Deduplicate messages and albums; edits must not move old posts above new ones."""
    by_key = {p.get('key', 'post:' + str(p['id'])): dict(p) for p in existing}
    for update in updates:
        message = update.get('channel_post') or update.get('edited_channel_post')
        if not message or message.get('chat', {}).get('id') != chat_id:
            continue
        if not CONTENT_KEYS.intersection(message):
            continue  # Do not publish channel membership/title service events.
        message_id = message.get('message_id')
        if not isinstance(message_id, int) or message_id <= 0:
            continue
        key = 'album:' + str(message['media_group_id']) if message.get('media_group_id') else 'post:' + str(message_id)
        previous = by_key.get(key)
        by_key[key] = {'id': min(previous['id'], message_id) if previous else message_id,
                       'date': message.get('date', 0), 'key': key}
    return sorted(by_key.values(), key=lambda p: (p.get('date', 0), p['id']), reverse=True)[:8]


def write_json(path, value):
    path.parent.mkdir(exist_ok=True)
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    temporary.replace(path)


def main():
    token = os.environ.get('TELEGRAM_BOT_TOKEN', '').strip()
    if not token:
        if os.environ.get('GITHUB_EVENT_NAME') == 'schedule':
            raise RuntimeError('TELEGRAM_BOT_TOKEN is missing. Add it in repository Actions secrets.')
        print('::warning::Telegram secret is not configured. Publishing the existing feed only.')
        return
    webhook = api(token, 'getWebhookInfo')
    if webhook.get('url'):
        raise RuntimeError('This bot already uses a webhook. Create a separate bot for this site; its webhook was NOT changed.')
    chat = api(token, 'getChat', {'chat_id': '@' + CHANNEL})
    if chat.get('type') != 'channel' or chat.get('username', '').lower() != CHANNEL:
        raise RuntimeError('Expected public channel not found. No updates were consumed.')
    bot = api(token, 'getMe')
    membership = api(token, 'getChatMember', {'chat_id': chat['id'], 'user_id': bot['id']})
    if membership.get('status') not in ('administrator', 'creator'):
        raise RuntimeError('Add this bot as an administrator of @bahchisarai before syncing.')
    state = json.loads(STATE.read_text()) if STATE.exists() else {'next_offset': 0}
    if state.get('bot_id') != bot['id']:
        state = {'next_offset': 0, 'bot_id': bot['id']}
    feed = json.loads(POSTS.read_text()) if POSTS.exists() else {'channel': CHANNEL, 'posts': []}
    # Only the already committed cursor is acknowledged. New updates are acknowledged on
    # the NEXT successful run, so a failed commit/deployment cannot silently consume them.
    updates = api(token, 'getUpdates', {'offset': state['next_offset'], 'limit': 100,
                                      'timeout': 0, 'allowed_updates': ['channel_post', 'edited_channel_post']})
    merged = merge_posts(feed.get('posts', []), updates, chat['id'])
    write_json(POSTS, {'channel': CHANNEL, 'posts': merged})
    if updates:
        write_json(STATE, {'next_offset': max(u['update_id'] for u in updates) + 1, 'bot_id': bot['id']})
    print(f'Telegram sync complete: {len(updates)} updates checked, {len(merged)} posts in feed.')
    if len(updates) == 100:
        print('::warning::Queue may contain more updates. Next run will collect the next batch.')


if __name__ == '__main__':
    try:
        main()
    except RuntimeError as exc:
        print('::error::' + str(exc), file=sys.stderr)
        sys.exit(1)
