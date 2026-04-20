from django.db import models
from django.conf import settings
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    class Meta:
        db_table = 'tasks_user'

    groups = None
    user_permissions = None


class Task(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE,
        related_name='tasks'
    )
    task = models.CharField(max_length=500)
    subject = models.CharField(max_length=100, default='Other')
    date = models.DateField(null=True, blank=True)
    urgent = models.BooleanField(default=False)
    completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-urgent', 'date', 'created_at']

    def to_dict(self):
        return {
            'id': self.id,
            'task': self.task,
            'subject': self.subject,
            'date': str(self.date) if self.date else '',
            'urgent': self.urgent,
            'completed': self.completed,
        }