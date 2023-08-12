FROM node:18-alpine as build

COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .

ARG VITE_SIGNALLING_HTTP
ARG VITE_SIGNALLING_WS
ENV VITE_SIGNALLING_HTTP=$VITE_SIGNALLING_HTTP
ENV VITE_SIGNALLING_WS=$VITE_SIGNALLING_WS

RUN npm run build

FROM pierrezemb/gostatic
COPY --from=build ./dist/ /srv/http/

EXPOSE 8043

CMD ["-fallback", "/index.html"]
