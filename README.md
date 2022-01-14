# redenomination
Backend for simulation website for experiment about redenomination 

## Production server url
`https://carbide-bongo-338115.et.r.appspot.com/`

## Api documentation
`https://carbide-bongo-338115.et.r.appspot.com/api-docs`

## About source code
### Install depencies
This project can only use [yarn](https://classic.yarnpkg.com/lang/en/docs/install/#debian-stable), please install it. After installing yarn, use:

```yarn install```

**Please also install and setup [postgresql](https://www.postgresql.org/download/)**
### Run as development
1. create `development.env` file in the root directory of this project, fill it with this text:
```
NODE_ENV="development"
DB_USER="your_database_username"
DB_PASSWORD="your_database_password"
DB_HOST="your_database_host"
DB_PORT=DATABASE_PORT
DB_NAME="your_database_name"
```
example:
```
NODE_ENV="development"
DB_USER="postgres"
DB_PASSWORD=""
DB_HOST="localhost"
DB_PORT=5432
DB_NAME="redenomination"
```
2. Run this command, `npm run dev`

