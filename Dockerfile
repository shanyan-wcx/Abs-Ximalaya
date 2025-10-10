FROM alpine:latest

ENV TZ=Asia/Shanghai
ENV PORT=7814
ENV NODE_ENV=production

RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo "$TZ" > /etc/timezone && apk add --no-cache nodejs npm

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY . .

EXPOSE ${PORT}

CMD ["npm", "start"]
