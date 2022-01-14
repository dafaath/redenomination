FROM node:14-alpine3.10 as ts-compiler

WORKDIR /usr/app
COPY package*.json ./
COPY yarn.lock ./
COPY tsconfig*.json ./
RUN yarn install
COPY . ./
RUN npm run build

FROM node:14-alpine3.10 as ts-remover
WORKDIR /usr/app
COPY --from=ts-compiler /usr/app/package*.json ./
COPY --from=ts-compiler /usr/app/yarn.lock ./
COPY --from=ts-compiler /usr/app/config ./config
COPY --from=ts-compiler /usr/app/*.env ./
COPY --from=ts-compiler /usr/app/dist ./
RUN yarn install --production

FROM public.ecr.aws/lambda/nodejs:14
WORKDIR /usr/app
COPY --from=ts-remover /usr/app ./
USER 1000
EXPOSE 3000
ENV NODE_ENV production
CMD ["app.js"]