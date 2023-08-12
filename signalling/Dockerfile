FROM node:18-alpine

WORKDIR /usr/app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN rm .env

CMD ["npm", "start"]
