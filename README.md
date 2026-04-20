# Homework Tracker

## Projekta apraksts

Homework Tracker ir tīmekļa lietotne mājas darbu un uzdevumu pārvaldībai. Katrs lietotājs var reģistrēties, pieteikties savā kontā un pārvaldīt savus uzdevumus — tie tiek saglabāti datubāzē un ir pieejami pat pēc pārlūkprogrammas aizvēršanas.

Lietotājs var pievienot uzdevumus ar priekšmetu, izpildes datumu un steidzamības statusu, atzīmēt tos kā paveiktus, rediģēt vai dzēst. Katrs lietotājs redz tikai savus uzdevumus — citu lietotāju dati nav pieejami.

### Projekta struktūra

```
homework_tracker/
├── manage.py
├── requirements.txt
├── db.sqlite3                  ← datubāze (tiek izveidota automātiski)
├── homework_tracker/           ← Django projekta konfigurācija
│   ├── settings.py
│   └── urls.py
├── tasks/                      ← galvenā lietotnes daļa
│   ├── models.py               ← Task un User modeļi
│   ├── views.py                ← autentifikācija + JSON API
│   ├── urls.py
│   └── tests.py                ← funkcionālie testi
├── templates/
│   ├── index.html              ← galvenais skats (pieprasa pieteikšanos)
│   ├── login.html
│   └── register.html
└── static/
    └── script.js               ← frontend loģika (fetch API)
```

---

## Izmantotās tehnoloģijas

| Tehnoloģija | Versija | Mērķis |
|---|---|---|
| Python | 3.10+ | Galvenā programmēšanas valoda |
| Django | 4.2 | Backend tīmekļa ietvars |
| SQLite | iebūvēts | Datubāze lietotāju un uzdevumu glabāšanai |
| HTML / CSS | — | Lietotāja saskarne |
| JavaScript (Vanilla) | — | Dinamiskas darbības pārlūkprogrammā (fetch API) |
| Tailwind CSS | CDN | Vizuālais stils |

**Django iebūvētās komponentes:**
- `django.contrib.auth` — lietotāju autentifikācija un sesijas
- `AbstractUser` — paplašināms lietotāja modelis
- `django.test` — funkcionālo testu ietvars

---

## Palaišanas instrukcija

### Prasības

- Python 3.10 vai jaunāks
- pip

### 1. Klonē repozitoriju

```bash
git clone https://github.com/Chugan908/agent.git
cd agent
```

### 2. Instalē atkarības

```bash
pip install -r requirements.txt
```

### 3. Izveido datubāzes tabulas

```bash
python manage.py makemigrations tasks
python manage.py migrate
```

### 4. Palaid serveri

```bash
python manage.py runserver
```

### 5. Atver pārlūkprogrammā

```
http://127.0.0.1:8000
```

Tiks automātiski atvērta pieteikšanās lapa.

### Testu palaišana

```bash
python manage.py test tasks -v 2
```

---

## Lietošanas apraksts

### Reģistrācija un pieteikšanās

1. Atverot lietotni pirmo reizi, tiek parādīta pieteikšanās lapa (`/login/`)
2. Ja konta vēl nav — noklikšķini uz **"Create one"**, lai atvērtu reģistrācijas lapu (`/register/`)
3. Ievadi lietotājvārdu un paroli (vismaz 6 simboli), apstipriniet paroli un noklikšķini **"Create Account"**
4. Pēc reģistrācijas esi automātiski pieteikts un nonāc galvenajā skatā
5. Lai atteiktos, noklikšķini pogu **"Logout"** augšējā labajā stūrī

### Uzdevumu pārvaldība

**Uzdevuma pievienošana:**
1. Ievadi uzdevuma nosaukumu laukā *"What needs to be done?"*
2. Izvēlies priekšmetu no saraksta (Math, Science, English, History, Art, Other)
3. Pēc izvēles norādi izpildes datumu
4. Ja uzdevums ir steidzams — atzīmē izvēles rūtiņu **URGENT** (uzdevums tiks iezīmēts sarkanā rāmī)
5. Noklikšķini **ADD** vai nospied **Enter**

**Uzdevuma atzīmēšana kā pabeigtu:**
- Noklikšķini uz apļa pogas uzdevuma kreisajā pusē — uzdevums tiks nosvītrots

**Uzdevuma rediģēšana:**
- Uzvedi peli uz uzdevuma un noklikšķini ikonu 📝 — parādīsies logs, kurā var mainīt nosaukumu

**Uzdevuma dzēšana:**
- Uzvedi peli uz uzdevuma un noklikšķini ikonu 🗑️

**Pabeigto uzdevumu notīrīšana:**
- Noklikšķini pogu **"Clear Done"** augšējā labajā stūrī — visi pabeigtie uzdevumi tiks dzēsti vienlaicīgi

### Filtrēšana

Uzdevumus var filtrēt ar trim pogām virs saraksta:

| Poga | Apraksts |
|---|---|
| **All** | Rāda visus uzdevumus |
| **Active** | Rāda tikai nepabeigtos uzdevumus |
| **Done** | Rāda tikai pabeigtos uzdevumus |

### Datu saglabāšana

Visi uzdevumi tiek saglabāti serverī SQLite datubāzē (`db.sqlite3`). Tas nozīmē, ka uzdevumi **netiek zaudēti** pēc pārlūkprogrammas aizvēršanas vai datora restartēšanas. Katrs lietotājs var redzēt tikai savus uzdevumus.
