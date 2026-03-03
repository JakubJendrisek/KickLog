FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# 1. Definujte ARG, aby Docker věděl, že má tuto proměnnou očekávat během buildu
ARG VITE_API_URL
# 2. Nastavte ji jako ENV, aby ji Vite viděl
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]