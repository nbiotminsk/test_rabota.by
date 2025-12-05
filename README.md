# Bitrix24 batch scripts

## Запуск (PowerShell, Windows)
- Задать вебхук в переменной окружения:
  ```
  $env:WEBHOOK="https://<your>.bitrix24.by/rest/1/<token>/"
  ```
- Инициализация проекта (один раз):
  ```
  npm init -y
  npm install axios
  ```

- Чтение компаний батчем и сохранение в JSON:
  ```
  node read_companies_batch.js
  ```
  Скрипт читает до 10000 записей и сохраняет файл `companies_<timestamp>.json` в корне проекта.

## Что указать вместо заглушки
- В скрипте вебхук берётся из `process.env.WEBHOOK`. Если переменная не задана, используется заглушка `https://example.com/rest/`

