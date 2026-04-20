import json
from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth import get_user_model

from .models import Task

User = get_user_model()

def create_user(username='testuser', password='secret123'):
    return User.objects.create_user(username=username, password=password)


def create_task(user, task='Do math homework', subject='Math',
                date='2025-12-01', urgent=False, completed=False):
    return Task.objects.create(
        user=user, task=task, subject=subject,
        date=date, urgent=urgent, completed=completed,
    )


def json_post(client, url, data):
    return client.post(
        url, data=json.dumps(data),
        content_type='application/json',
    )


def json_patch(client, url, data):
    return client.patch(
        url, data=json.dumps(data),
        content_type='application/json',
    )

class TaskListCreateTests(TestCase):

    def setUp(self):
        self.client = Client()
        self.user = create_user()
        self.client.login(username='testuser', password='secret123')
        self.url = reverse('tasks_api')

    def test_get_tasks_returns_empty_list_for_new_user(self):
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), [])

    def test_get_tasks_returns_only_own_tasks(self):
        other = create_user('other', 'pass1234')
        create_task(self.user, task='My task')
        create_task(other, task='Their task')

        res = self.client.get(self.url)
        tasks = res.json()
        self.assertEqual(len(tasks), 1)
        self.assertEqual(tasks[0]['task'], 'My task')

    def test_create_task_returns_201(self):
        res = json_post(self.client, self.url, {
            'task': 'Read chapter 5',
            'subject': 'English',
            'date': '2025-11-15',
            'urgent': False,
        })
        self.assertEqual(res.status_code, 201)

    def test_create_task_saves_to_database(self):
        json_post(self.client, self.url, {
            'task': 'Read chapter 5',
            'subject': 'English',
            'date': '2025-11-15',
            'urgent': False,
        })
        self.assertEqual(Task.objects.filter(user=self.user).count(), 1)

    def test_create_task_returns_correct_fields(self):
        res = json_post(self.client, self.url, {
            'task': 'Read chapter 5',
            'subject': 'Science',
            'date': '2025-11-15',
            'urgent': True,
        })
        data = res.json()
        self.assertEqual(data['task'], 'Read chapter 5')
        self.assertEqual(data['subject'], 'Science')
        self.assertEqual(data['date'], '2025-11-15')
        self.assertTrue(data['urgent'])
        self.assertFalse(data['completed'])
        self.assertIn('id', data)

    def test_create_task_fails_with_empty_task(self):
        res = json_post(self.client, self.url, {'task': ''})
        self.assertEqual(res.status_code, 400)
        self.assertIn('error', res.json())

    def test_create_task_fails_with_missing_task_field(self):
        res = json_post(self.client, self.url, {'subject': 'Math'})
        self.assertEqual(res.status_code, 400)

    def test_create_task_defaults_subject_to_other(self):
        res = json_post(self.client, self.url, {'task': 'Something'})
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.json()['subject'], 'Other')

    def test_create_task_allows_no_date(self):
        res = json_post(self.client, self.url, {'task': 'No deadline task'})
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.json()['date'], '')

    def test_create_task_fails_with_invalid_json(self):
        res = self.client.post(self.url, data='not json',
                               content_type='application/json')
        self.assertEqual(res.status_code, 400)

    def test_get_tasks_returns_multiple_tasks(self):
        create_task(self.user, task='Task 1')
        create_task(self.user, task='Task 2')
        create_task(self.user, task='Task 3')
        res = self.client.get(self.url)
        self.assertEqual(len(res.json()), 3)


class TaskUpdateTests(TestCase):

    def setUp(self):
        self.client = Client()
        self.user = create_user()
        self.client.login(username='testuser', password='secret123')
        self.task = create_task(self.user)
        self.url = reverse('task_detail_api', args=[self.task.id])

    def test_toggle_task_to_completed(self):
        res = json_patch(self.client, self.url, {'completed': True})
        self.assertEqual(res.status_code, 200)
        self.task.refresh_from_db()
        self.assertTrue(self.task.completed)

    def test_toggle_task_back_to_active(self):
        self.task.completed = True
        self.task.save()
        json_patch(self.client, self.url, {'completed': False})
        self.task.refresh_from_db()
        self.assertFalse(self.task.completed)

    def test_rename_task(self):
        res = json_patch(self.client, self.url, {'task': 'Updated task name'})
        self.assertEqual(res.status_code, 200)
        self.task.refresh_from_db()
        self.assertEqual(self.task.task, 'Updated task name')

    def test_patch_empty_task_name_ignored(self):
        original_name = self.task.task
        json_patch(self.client, self.url, {'task': '   '})
        self.task.refresh_from_db()
        self.assertEqual(self.task.task, original_name)

    def test_patch_nonexistent_task_returns_404(self):
        res = json_patch(self.client, reverse('task_detail_api', args=[99999]),
                         {'completed': True})
        self.assertEqual(res.status_code, 404)

    def test_patch_returns_updated_data(self):
        res = json_patch(self.client, self.url, {
            'completed': True,
            'task': 'New name',
        })
        data = res.json()
        self.assertTrue(data['completed'])
        self.assertEqual(data['task'], 'New name')

class TaskDeleteTests(TestCase):

    def setUp(self):
        self.client = Client()
        self.user = create_user()
        self.client.login(username='testuser', password='secret123')
        self.task = create_task(self.user)
        self.url = reverse('task_detail_api', args=[self.task.id])

    def test_delete_task_returns_200(self):
        res = self.client.delete(self.url)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), {'status': 'deleted'})

    def test_delete_task_removes_from_database(self):
        self.client.delete(self.url)
        self.assertFalse(Task.objects.filter(id=self.task.id).exists())

    def test_delete_nonexistent_task_returns_404(self):
        res = self.client.delete(reverse('task_detail_api', args=[99999]))
        self.assertEqual(res.status_code, 404)

    def test_delete_only_removes_target_task(self):
        other_task = create_task(self.user, task='Keep this one')
        self.client.delete(self.url)
        self.assertTrue(Task.objects.filter(id=other_task.id).exists())


class ClearCompletedTests(TestCase):

    def setUp(self):
        self.client = Client()
        self.user = create_user()
        self.client.login(username='testuser', password='secret123')
        self.url = reverse('tasks_api')

    def test_clear_completed_removes_only_completed_tasks(self):
        create_task(self.user, task='Done 1', completed=True)
        create_task(self.user, task='Done 2', completed=True)
        active = create_task(self.user, task='Still active', completed=False)

        res = json_post(self.client, self.url, {'action': 'clear_completed'})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['deleted'], 2)

        remaining = Task.objects.filter(user=self.user)
        self.assertEqual(remaining.count(), 1)
        self.assertEqual(remaining.first().id, active.id)

    def test_clear_completed_only_affects_own_tasks(self):
        other = create_user('other', 'pass1234')
        create_task(self.user, task='My done task', completed=True)
        other_task = create_task(other, task='Their done task', completed=True)

        json_post(self.client, self.url, {'action': 'clear_completed'})

        self.assertTrue(Task.objects.filter(id=other_task.id).exists())

    def test_clear_completed_with_none_completed_returns_zero(self):
        create_task(self.user, task='Active task', completed=False)
        res = json_post(self.client, self.url, {'action': 'clear_completed'})
        self.assertEqual(res.json()['deleted'], 0)
        self.assertEqual(Task.objects.filter(user=self.user).count(), 1)


