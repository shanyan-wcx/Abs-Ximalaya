FROM alpine:latest AS builder
RUN apk add --no-cache --update nodejs npm
WORKDIR /app
COPY package.json /app/package.json
RUN cd /app
RUN npm install
COPY . /app

FROM alpine:latest
RUN apk add --no-cache --update nodejs npm
WORKDIR /app
COPY --from=builder /app .
EXPOSE 7814
CMD npm start