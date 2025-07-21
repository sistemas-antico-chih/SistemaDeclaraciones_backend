FROM node:14-alpine

#MAINTAINER Sergio Rodríguez <sergio.rdzsg@gmail.com>

ADD . /backend
WORKDIR /backend

ARG NODE_ENV

RUN npm i express-unless --save
RUN yarn add global yarn \
&& yarn install \
&& yarn build \
&& yarn cache clean

EXPOSE ${PORT}

CMD ["yarn", "start"]
