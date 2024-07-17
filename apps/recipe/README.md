<div align="center">

  <h1>Scraping recipe</h1>

  <p>
    Scraping bible from monngonmoingay
  </p>

</div>

<br />

## Getting started

Go to the app directory:

```bash
cd apps/recipe
```

Setup Postgres database using Docker compose:

```bash
docker-compose up -d
```

Migrate the database:

```bash
pnpm prisma:migrate
```

Generate Prisma client:

```bash
pnpm prisma:generate
```

## Environment Variables

To run this project, you will need to add the following environment variables to
your `.env` file:

- **App configs:**

  `DB_URL`: Postgres database connection URL.

  `LOG_LEVEL`: Log level.

E.g:

```
# .env
DB_URL="postgres://postgres:postgres@localhost:5432/recipe"
LOG_LEVEL=info
```

You can also check out the file `.env.example` to see all required environment
variables.

## Scripts

Scrape recipe (from [monngonmoingay.com/](https://monngonmoingay.com/)):

```bash
npx tsx ./src/monngonmoingay/main.ts
```

The script will create a file `urls.log` that list all recipe urls and truncate
on every run. You can copy the file `urls.log.example` and comment out `await
getMenu();` in file `main.ts` to reduce time for scraping.

> [!NOTE]
> To prevent the error `net::ERR_NETWORK_CHANGED`, you can temporarily disable
> the ipv6 on your network adapter:
>
> ```bash
> sudo sysctl -w net.ipv6.conf.all.disable_ipv6=1
> sudo sysctl -w net.ipv6.conf.default.disable_ipv6=1
> ```
