FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# Install ALL deps including devDependencies (needed for prisma CLI during build)
RUN npm install

COPY prisma ./prisma

# Uses locally installed prisma@6.x — not npx latest
RUN npx prisma generate

COPY . .

EXPOSE 5000

CMD ["node", "src/server.js"]