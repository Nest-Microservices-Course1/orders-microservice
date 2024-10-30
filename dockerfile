# Imagen base de Node.js en Alpine
FROM node:21-alpine3.19

# Establecer el directorio de trabajo
WORKDIR /usr/src/app

# Copiar archivos para instalar dependencias
COPY package.json .
COPY package-lock.json .

# Instalar dependencias
RUN npm install

# Copiar el resto de los archivos al contenedor
COPY . .

# Exponer el puerto 3002
EXPOSE 3002
