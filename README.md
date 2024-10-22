# Orders Microservice  
## Dev 
1. Clonar el repositorio  
2. Instalar dependencias  
3. Crear un achivo `.env` con las variables de entorno  
4. Ejecutar la migración de Prisma  
```bash
npx prisma migrate dev
```
5. Ejecutar  
```bash
npm run start:dev
```

## Extra
Ejecuta docker:
```bash
docker compose up -d
```