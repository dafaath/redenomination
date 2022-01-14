FROM node:12.16.0-alpine

RUN apk add tini

COPY package*.json /
RUN npm install --prefix /

FROM public.ecr.aws/lambda/nodejs:14
WORKDIR /usr/app
COPY --from=ts-remover /usr/app ./
USER 1000
EXPOSE 3000
ENV NODE_ENV production
CMD ["app.js"]
