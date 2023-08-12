FROM node:18-alpine

WORKDIR /usr/app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .

EXPOSE 8080

CMD ["npm", "start"]
