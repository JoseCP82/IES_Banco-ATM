#Primera Etapa -> BUILD
FROM node:16.10-alpine as build-step
RUN mkdir -p /app
WORKDIR /app
COPY package.json /app
RUN npm install
COPY . /app
RUN npm run build --prod

#Segunda Etapa -> DESPLIEGUE EN WEB
FROM nginx:1.17.1-alpine
COPY --from=build-step /app/dist/atm /usr/share/nginx/html
CMD ["/bin/sh",  "-c",  "envsubst < /usr/share/nginx/html/assets/env.pre.js > /usr/share/nginx/html/assets/env.js && exec nginx -g 'daemon off;'"]
#Creación Imagen -> docker build -t bancamarchatm .
#Ejecución Imagen -> docker run -d -it -p 80:80 bancamarchatm
#docker run -d -it -p 80:80 --env API_URL="https://developodo.io" --env ATM_ID="2222" bancamarchatm:latest


