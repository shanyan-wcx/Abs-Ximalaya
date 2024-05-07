FROM alpine:latest AS builder
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo '$TZ' > /etc/timezone
RUN apk add --no-cache --update nodejs npm
WORKDIR /app
COPY package.json /app/package.json
RUN cd /app
RUN npm install
COPY . /app

FROM alpine:latest
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo '$TZ' > /etc/timezone
RUN apk add --no-cache --update nodejs npm
WORKDIR /app
COPY --from=builder /app .
EXPOSE 7814
CMD npm start
