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
1. Configure your database in config/default.js
2. Run this command, `npm run dev`

### Run as production build
1. Create .env file consisting of this value
```
NODE_ENV="development"
DB_USER="your_database_username"
DB_PASSWORD="your_database_password"
DB_HOST="your_database_host"
DB_PORT=DATABASE_PORT
DB_NAME="your_database_name"
JWT_KEY="64_bit_random_string"
ADMIN_PASSWORD="admin_password"
```
2. Run `npm run build`
3. `npm start`
