import json
from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth import get_user_model
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from .models import Task


@login_required
def index(request):
    return render(request, 'index.html', {'username': request.user.username})


def login_view(request):
    if request.user.is_authenticated:
        return redirect('index')
    error = None
    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        password = request.POST.get('password', '')
        user = authenticate(request, username=username, password=password)
        if user:
            login(request, user)
            return redirect('index')
        else:
            error = 'Invalid username or password.'
    return render(request, 'login.html', {'error': error})


User = get_user_model()
def register_view(request):
    if request.user.is_authenticated:
        return redirect('index')
    error = None
    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        password = request.POST.get('password', '')
        password2 = request.POST.get('password2', '')
        if not username or not password:
            error = 'Username and password are required.'
        elif password != password2:
            error = "Passwords don't match."
        elif len(password) < 6:
            error = 'Password must be at least 6 characters.'
        elif User.objects.filter(username=username).exists():
            error = 'That username is already taken.'
        else:
            user = User.objects.create_user(username=username, password=password)
            login(request, user)
            return redirect('index')
    return render(request, 'register.html', {'error': error})


def logout_view(request):
    logout(request)
    return redirect('login')


@login_required
@require_http_methods(['GET', 'POST'])
def tasks_api(request):
    """
    GET  /api/tasks/          → list all tasks for the logged-in user
    POST /api/tasks/          → create a new task
    POST /api/tasks/ {action: 'clear_completed'} → delete all completed tasks
    """
    if request.method == 'GET':
        tasks = Task.objects.filter(user=request.user)
        return JsonResponse([t.to_dict() for t in tasks], safe=False)

    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    if body.get('action') == 'clear_completed':
        deleted_count, _ = Task.objects.filter(user=request.user, completed=True).delete()
        return JsonResponse({'status': 'ok', 'deleted': deleted_count})

    task_text = body.get('task', '').strip()
    if not task_text:
        return JsonResponse({'error': 'Task text is required.'}, status=400)

    raw_date = body.get('date') or None
    task = Task.objects.create(
        user=request.user,
        task=task_text,
        subject=body.get('subject', 'Other'),
        date=raw_date,
        urgent=bool(body.get('urgent', False)),
        completed=False,
    )
    return JsonResponse(task.to_dict(), status=201)


@login_required
@require_http_methods(['PATCH', 'DELETE'])
def task_detail_api(request, task_id):
    """
    PATCH  /api/tasks/<id>/  → update a task (toggle complete, rename)
    DELETE /api/tasks/<id>/  → delete a task
    """
    try:
        task = Task.objects.get(id=task_id, user=request.user)
    except Task.DoesNotExist:
        return JsonResponse({'error': 'Task not found.'}, status=404)

    if request.method == 'DELETE':
        task.delete()
        return JsonResponse({'status': 'deleted'})

    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    if 'completed' in body:
        task.completed = bool(body['completed'])
    if 'task' in body:
        new_text = body['task'].strip()
        if new_text:
            task.task = new_text
    task.save()
    return JsonResponse(task.to_dict())
