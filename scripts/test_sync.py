import unittest
from sync_telegram import merge_posts


def update(i, mid, chat=-100123, **kwargs):
    return {'update_id': i, 'channel_post': {'message_id': mid, 'date': mid * 100,
            'chat': {'id': chat}, 'text': 'Post', **kwargs}}


class FeedTests(unittest.TestCase):
    def test_wrong_channel_is_never_published(self):
        self.assertEqual(merge_posts([], [update(1, 1, chat=-200)], -100123), [])

    def test_retry_does_not_duplicate(self):
        batch = [update(1, 20), update(2, 21)]
        first = merge_posts([], batch, -100123)
        self.assertEqual(merge_posts(first, batch, -100123), first)

    def test_album_across_runs_is_one_post(self):
        first = merge_posts([], [update(1, 20, media_group_id='album')], -100123)
        second = merge_posts(first, [update(2, 21, media_group_id='album')], -100123)
        self.assertEqual(len(second), 1)
        self.assertEqual(second[0]['id'], 20)

    def test_edit_does_not_reorder_history(self):
        first = merge_posts([], [update(1, 20), update(2, 30)], -100123)
        edit = {'update_id': 3, 'edited_channel_post': update(1, 20)['channel_post']}
        self.assertEqual([p['id'] for p in merge_posts(first, [edit], -100123)], [30, 20])

    def test_keep_latest_eight(self):
        result = merge_posts([], [update(i, i) for i in range(1, 110)], -100123)
        self.assertEqual([p['id'] for p in result], list(range(109, 101, -1)))

    def test_skip_service_events(self):
        event = {'update_id': 2, 'channel_post': {'message_id': 3, 'date': 100,
                 'chat': {'id': -100123}, 'new_chat_title': 'New title'}}
        self.assertEqual(merge_posts([], [event], -100123), [])


if __name__ == '__main__':
    unittest.main()
