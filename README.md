# NytheraClient Site

Готовый бесплатный проект сайта с backend, SQLite-базой и авторизацией.

## Что внутри

- Красивый frontend для NytheraClient
- GUI-картинка в `public/gui.png`
- Backend на Node.js + Express
- Бесплатная SQLite-база `database.sqlite`
- Регистрация и вход
- Пароли хранятся как bcrypt-хеш, не открытым текстом
- JWT cookie-сессия

## Как запустить

1. Установи Node.js LTS: https://nodejs.org
2. Распакуй проект
3. В папке проекта выполни:

```bash
npm install
```

4. Создай `.env` из примера:

```bash
cp .env.example .env
```

5. В `.env` замени `JWT_SECRET` на длинную случайную строку.
6. Запусти:

```bash
npm start
```

7. Открой:

```txt
http://localhost:3000
```

## Где база данных

После первого запуска появится файл:

```txt
database.sqlite
```

В нем будет таблица `users`.

## API

```txt
POST /api/register
POST /api/login
GET  /api/me
POST /api/logout
```

## Как заменить GUI

Замени файл:

```txt
public/gui.png
```

на свой скриншот с таким же названием.

## Важно для публикации

Для локального старта SQLite подходит. Для публичного сайта лучше использовать PostgreSQL и `secure: true` для cookie на HTTPS.
