# Orders Microservice  
## Dev  
1. Clonar el repositorio  
2. Instalar dependencias  
3. Crear un achivo `.env` con las variables de entorno  
4. Levantar la base de datos 
```bash
docker compose up -d
```
5. Levantar el servidor de NATS
```bash
docker run -d --name nats-server -p 4222:4222 -p 8222:8222 nats
```
6. Ejecutar  
```bash
npm run start:dev
```