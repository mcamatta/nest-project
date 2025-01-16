FROM node:20

WORKDIR /var/www/html

COPY . .

RUN npm install

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start:dev"]