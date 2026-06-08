# 🎬 Watch-TMDB

<p align="center">
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white" alt="MySQL" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
</p>

<p align="center">
  <a href="https://github.com/MiinaMagdy/Watch-TMDB/actions/workflows/test.yml">
    <img src="https://img.shields.io/github/actions/workflow/status/MiinaMagdy/Watch-TMDB/test.yml?branch=master&label=Tests&style=flat-square&logo=github" alt="Tests" />
  </a>
  <a href="#">
    <!-- Currently hardcoded to your recent coverage run. You can automate this with Coveralls or Codecov! -->
    <img src="https://img.shields.io/badge/Coverage-85%25-green?style=flat-square&logo=jest" alt="Coverage" />
  </a>
</p>

A powerful backend service built with **NestJS** to manage movies, genres, ratings, and watchlists. The application synchronizes with the **TMDB API**, uses **Prisma ORM** with **MySQL**, and implements caching for blazing-fast movie retrievals.

---

## ✨ Features
- **🔐 Authentication**: Secure JWT-based user authentication and authorization using Passport.
- **🎬 Movie Management**: Fetch, browse, and search movies integrated directly with TMDB.
- **⭐ Ratings & Watchlists**: Users can rate movies and manage their personal watchlists seamlessly.
- **⚡ Caching**: Optimized endpoints with `@nestjs/cache-manager` to reduce database and third-party API loads.
- **🐳 Containerized & Cross-Platform**: Fully dockerized using a multi-stage `Dockerfile` and Docker Compose. Prisma models are explicitly mapped to lowercase database tables (`@@map`) to guarantee seamless cross-platform deployment between Windows and Linux environments.
- **🕰️ Scheduled Tasks**: Automated cron jobs to sync TMDB deltas overnight.

## 📁 Project Structure

```text
src/
├── auth/          # JWT authentication, guards, and strategies
├── common/        # Global exception filters and decorators
├── generated/     # Generated Prisma client output
├── movie/         # Movie fetching, TMDB integration, ratings, and caching
├── user/          # User management and watchlists
├── app.module.ts  # Root module
└── main.ts        # Application entry point
```

## 🛠️ Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/en/) (v22+)
- [Docker](https://www.docker.com/) & Docker Compose
- TMDB API Key (Create an account on [TMDB](https://www.themoviedb.org/) to get an API Key and Access Token)

## 🚀 Setup Process

### 1. Environment Configuration

If you haven't already, configure your production `.env.prod` file in the root of the project:

```env
# MySQL Database Configuration
MYSQL_ROOT_PASSWORD=root
MYSQL_DATABASE=watch_tmdb
MYSQL_USER=dbuser
MYSQL_PASSWORD=root

# App Database Connection Parameters
DATABASE_HOST=mysql_db
DATABASE_PORT=3306
DATABASE_NAME=watch_tmdb
DATABASE_USER=dbuser
DATABASE_PASSWORD=root

# Prisma URL
DATABASE_URL=mysql://dbuser:root@mysql_db:3306/watch_tmdb

# Application Secrets
JWT_SECRET=your_super_secret_key
JWT_EXPIRATION_TIME=1d

# TMDB Configuration
TMDB_API_KEY=your_tmdb_api_key
TMDB_READ_ACCESS_TOKEN=your_tmdb_access_token
TMDB_BASE_URL=https://api.themoviedb.org/3
```

### 2. Run with Docker Compose

To start both the MySQL database and the NestJS application in the background:
```bash
docker compose up --build -d
```
*Note: The application will automatically run the Prisma migrations before starting the server to ensure your database schema is up-to-date.*

The API will now be available at `http://localhost:8080/api`.

### 3. Seeding the Database

Once the application is running, you can seed your local database with initial movies and genres directly from TMDB:
```bash
curl -X POST http://localhost:8080/api/movies/seed?pages=5
```

---

### 4. Database Migrations

The database migrations have been strategically squashed into a single unified `init` migration to maintain a clean history. When you run `docker compose up`, the container automatically executes `npx prisma migrate deploy` to safely apply the schema to the MySQL database before booting the application.

---

## 🧪 Testing

The project uses **Jest** for comprehensive unit testing across services and controllers.

```bash
# Run unit tests
npm run test

# Run tests with coverage report
npm run test:cov
```
