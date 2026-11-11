# Chat App

A learning project for a simple one-to-one realtime messenger. The project uses
Next.js for the client, Express for the API, and SQLite for persistent data.

## Requirements

- Node.js 22 or newer
- npm

## Setup

Copy `server/.env.example` to `server/.env` and set `JWT_SECRET` to a local
development secret. The client is configured to use `http://localhost:4000`.

Install dependencies in both apps:

```sh
npm install --prefix server
npm install --prefix client
```

## Run

Start the API and database:

```sh
npm run dev --prefix server
```

In another terminal, start the website:

```sh
npm run dev --prefix client
```

Open <http://localhost:3000>. The API health endpoint is
<http://localhost:4000/api/health>.
